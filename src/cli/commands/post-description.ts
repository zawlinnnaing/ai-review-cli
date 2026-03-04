import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
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

interface PostDescriptionOptions {
  text?: string;
  input?: string;
}

export function registerPostDescriptionCommand(program: Command): void {
  program
    .command('post-description <url>')
    .description(
      'Post a description to a GitLab Merge Request.\n' +
        'Provide description via --text or from a JSON file with a "description" key.\n' +
        'Example: ai-review post-description https://gitlab.com/group/repo/-/merge_requests/123 --text "My description"\n' +
        'Example: ai-review post-description https://gitlab.com/group/repo/-/merge_requests/123 --input review-output.json',
    )
    .option('--text <string>', 'Description text to post directly')
    .option(
      '--input <file>',
      'Path to a JSON file containing a "description" key (default: review-output.json)',
    )
    .action(async (url: string, options: PostDescriptionOptions) => {
      let description: string;

      if (options.text !== undefined) {
        // Use the provided text directly
        description = options.text;
      } else {
        // Read from file (default: review-output.json)
        const filePath = path.resolve(options.input ?? 'review-output.json');

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
          parsed = JSON.parse(raw!);
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

        if (!result.data.description) {
          console.error(
            JSON.stringify({
              error: 'MISSING_DESCRIPTION',
              message: `No "description" field found in: ${filePath}`,
            }),
          );
          process.exit(1);
        }

        description = result.data.description;
      }

      try {
        const { domain, projectPath, mrIid } = parseGitLabMRUrl(url);
        const credentials = await getGitLabCredentialsForDomain(domain);
        const provider = new GitLabProvider(
          credentials.baseUrl,
          credentials.token,
        );

        await provider.updateDescription(projectPath, mrIid, description);
        console.log('MR description updated successfully.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ error: 'POST_FAILED', message }));
        process.exit(1);
      }
    });
}
