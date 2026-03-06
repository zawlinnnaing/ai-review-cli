import { Command } from 'commander';
import { getGitLabCredentialsForDomain } from '../../utils/credentials';
import { GitLabProvider } from '../../providers/gitlab/gitlab-provider';

interface ParsedRepoUrl {
  domain: string;
  projectPath: string;
}

function parseGitLabRepoUrl(rawUrl: string): ParsedRepoUrl {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: "${rawUrl}"`);
  }

  const domain = parsed.hostname;
  // Strip leading slash and optional trailing .git
  const projectPath = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '');

  if (!projectPath || projectPath.split('/').length < 2) {
    throw new Error(
      `URL does not look like a GitLab repository URL: "${rawUrl}"\n` +
        `Expected format: https://<host>/<namespace>/<repo>`,
    );
  }

  return { domain, projectPath };
}

export function registerCreateMrCommand(program: Command): void {
  program
    .command('create-mr <repoUrl> <sourceBranch> <targetBranch>')
    .description(
      'Create a GitLab Merge Request for the given repository.\n' +
        'Example: ai-review create-mr https://gitlab.com/group/repo feature-branch main',
    )
    .option('--title <title>', 'Title for the merge request')
    .action(
      async (
        repoUrl: string,
        sourceBranch: string,
        targetBranch: string,
        options: { title?: string },
      ) => {
        try {
          const { domain, projectPath } = parseGitLabRepoUrl(repoUrl);

          const credentials = await getGitLabCredentialsForDomain(domain);
          const provider = new GitLabProvider(
            credentials.baseUrl,
            credentials.token,
          );

          const title =
            options.title ?? `Merge ${sourceBranch} into ${targetBranch}`;

          const mr = await provider.createMergeRequest(
            projectPath,
            sourceBranch,
            targetBranch,
            title,
          );

          const mrUrl = `${credentials.baseUrl}/${projectPath}/-/merge_requests/${mr.iid}`;
          console.log(`Merge request created: ${mrUrl}`);
          console.log(JSON.stringify(mr, null, 2));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          console.error(JSON.stringify({ error: 'CREATE_MR_FAILED', message }));
          process.exit(1);
        }
      },
    );
}
