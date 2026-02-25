import * as fs from 'fs';
import * as path from 'path';
import { Command, Option } from 'commander';
import { getGitLabCredentialsForDomain } from '../../utils/credentials';
import { GitLabProvider } from '../../providers/gitlab/gitlab-provider';
import { ReviewSchema } from '../../schema/review-output.schema';

interface ParsedMRUrl {
  domain: string;
  projectPath: string;
  mrIid: string;
}

function parseGitLabMRUrl(rawUrl: string): ParsedMRUrl {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  const domain = parsed.hostname;
  const match = parsed.pathname.match(/^(.*)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    throw new Error(
      `URL does not look like a GitLab MR URL: "${rawUrl}"\n` +
        `Expected format: https://<host>/<namespace>/<repo>/-/merge_requests/<iid>`,
    );
  }

  const projectPath = match[1].replace(/^\//, '');
  const mrIid = match[2];

  return { domain, projectPath, mrIid };
}

type Severity = 'suggestion' | 'warning' | 'critical';

const SEVERITY_ORDER: Record<Severity, number> = {
  suggestion: 0,
  warning: 1,
  critical: 2,
};

interface PostCommentsOptions {
  input: string;
  severity?: Severity;
}

export function registerPostCommentsCommand(program: Command): void {
  program
    .command('post-comments <url>')
    .description(
      'Post AI review comments to a GitLab Merge Request.\n' +
        'Example: ai-review post-comments https://gitlab.com/group/repo/-/merge_requests/123 --input review.json',
    )
    .requiredOption('--input <file>', 'Path to the review JSON file')
    .addOption(
      new Option(
        '--severity <level>',
        'Minimum severity level to post (suggestion | warning | critical). Only comments at or above this level are posted.',
      ).choices(['suggestion', 'warning', 'critical']),
    )
    .action(async (url: string, options: PostCommentsOptions) => {
      const filePath = path.resolve(options.input);

      let raw: string;
      try {
        raw = fs.readFileSync(filePath, 'utf-8');
      } catch {
        console.error(
          JSON.stringify({
            error: 'FILE_NOT_FOUND',
            message: `Cannot read file: ${filePath}`,
          }),
        );
        process.exit(1);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.error(
          JSON.stringify({
            error: 'INVALID_JSON',
            message: `File is not valid JSON: ${filePath}`,
          }),
        );
        process.exit(1);
      }

      const result = ReviewSchema.safeParse(parsed);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        console.error(
          JSON.stringify({
            error: 'INVALID_SCHEMA',
            message: issues,
          }),
        );
        process.exit(1);
      }

      const { comments: allComments } = result.data;

      const comments =
        options.severity !== undefined
          ? allComments.filter(
              (c) => SEVERITY_ORDER[c.severity] >= SEVERITY_ORDER[options.severity!],
            )
          : allComments;

      try {
        const { domain, projectPath, mrIid } = parseGitLabMRUrl(url);
        const credentials = await getGitLabCredentialsForDomain(domain);
        const provider = new GitLabProvider(
          credentials.baseUrl,
          credentials.token,
        );

        await provider.postReviewComments(projectPath, mrIid, comments);
        const skipped = allComments.length - comments.length;
        const skippedNote =
          skipped > 0 ? ` (${skipped} skipped below --severity ${options.severity})` : '';
        console.log(
          `Posted ${comments.length} comment${comments.length !== 1 ? 's' : ''} to MR.${skippedNote}`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ error: 'POST_FAILED', message }));
        process.exit(1);
      }
    });
}
