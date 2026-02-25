import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { getGitLabCredentialsForDomain } from '../../utils/credentials';
import { GitLabProvider } from '../../providers/gitlab/gitlab-provider';
import { MRContextBuilder } from '../../context/mr-context-builder';

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
  // GitLab MR URLs follow the pattern:
  //   https://<host>/<namespace>/<repo>/-/merge_requests/<iid>
  const match = parsed.pathname.match(/^(.*)\/-\/merge_requests\/(\d+)/);
  if (!match) {
    throw new Error(
      `URL does not look like a GitLab MR URL: "${rawUrl}"\n` +
        `Expected format: https://<host>/<namespace>/<repo>/-/merge_requests/<iid>`,
    );
  }

  const projectPath = match[1].replace(/^\//, ''); // strip leading slash
  const mrIid = match[2];

  return { domain, projectPath, mrIid };
}

interface GetContextOptions {
  stdout?: boolean;
  output?: string;
}

export function registerGetContextCommand(program: Command): void {
  program
    .command('get-context <url>')
    .description(
      'Fetch MR context from a GitLab Merge Request URL and output JSON.\n' +
        'Example: ai-review get-context https://gitlab.com/group/repo/-/merge_requests/123',
    )
    .option('--stdout', 'Print output to stdout instead of writing to a file')
    .option('--output <path>', 'Write output to the specified file path')
    .action(async (url: string, options: GetContextOptions) => {
      try {
        const { domain, projectPath, mrIid } = parseGitLabMRUrl(url);

        const credentials = await getGitLabCredentialsForDomain(domain);
        const provider = new GitLabProvider(
          credentials.baseUrl,
          credentials.token,
        );
        const builder = new MRContextBuilder(provider);

        const context = await builder.build(projectPath, mrIid);
        const json = JSON.stringify(context, null, 2);

        // Determine output destination:
        // --output takes precedence over --stdout.
        // If neither is provided, default to ai-review-output/review.json.
        if (options.output) {
          const outputPath = path.resolve(options.output);
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, json, 'utf-8');
          console.log(`Output written to: ${outputPath}`);
        } else if (options.stdout) {
          console.log(json);
        } else {
          const outputPath = path.resolve('ai-review-output', 'review.json');
          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, json, 'utf-8');
          console.log(`Output written to: ${outputPath}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ error: 'FETCH_FAILED', message }));
        process.exit(1);
      }
    });
}
