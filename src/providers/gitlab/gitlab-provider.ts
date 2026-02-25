import { GitProvider, MergeRequest, FileDiff, ReviewComment } from '../base';
import { createTwoFilesPatch } from 'diff';
import { GitLabClient } from './gitlab-client';
import { detectLanguage, annotateDiffWithLineNumbers } from '../../context/diff-parser';

interface RawMergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string | null;
  source_branch: string;
  target_branch: string;
  diff_refs?: {
    base_sha: string;
    head_sha: string;
    start_sha: string;
  };
}

interface RawChange {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  deleted_file: boolean;
  renamed_file: boolean;
  too_large?: boolean;
}

// /diffs returns a flat array of RawChange objects (no wrapper object)

export class GitLabProvider implements GitProvider {
  private client: GitLabClient;

  constructor(baseUrl: string, token: string) {
    this.client = new GitLabClient(baseUrl, token);
  }

  async getMergeRequest(
    projectId: string,
    mrId: string,
  ): Promise<MergeRequest> {
    const raw = (await this.client.getMergeRequest(
      projectId,
      mrId,
    )) as RawMergeRequest;

    return {
      id: raw.id,
      iid: raw.iid,
      title: raw.title,
      description: raw.description ?? '',
      sourceBranch: raw.source_branch,
      targetBranch: raw.target_branch,
    };
  }

  async getMergeRequestChanges(
    projectId: string,
    mrId: string,
  ): Promise<FileDiff[]> {
    const [rawMr, changes] = (await Promise.all([
      this.client.getMergeRequest(projectId, mrId),
      this.client.getMergeRequestDiffs(projectId, mrId),
    ])) as [RawMergeRequest, RawChange[]];

    // For files where GitLab truncated the diff due to size, fall back to fetching
    // raw file content from both branches and computing the diff client-side.
    const largeFallbacks = changes
      .filter((c) => c.too_large && c.diff === '')
      .map(async (change) => {
        const [oldContent, newContent] = await Promise.all([
          change.new_file
            ? Promise.resolve('')
            : this.client.getFileContent(
                projectId,
                rawMr.target_branch,
                change.old_path,
              ),
          change.deleted_file
            ? Promise.resolve('')
            : this.client.getFileContent(
                projectId,
                rawMr.source_branch,
                change.new_path,
              ),
        ]);
        change.diff = createTwoFilesPatch(
          change.old_path,
          change.new_path,
          oldContent,
          newContent,
        );
      });
    await Promise.all(largeFallbacks);

    return changes
      .filter((change) => !isBinaryOrExcluded(change))
      .map((change) => ({
        path: change.new_path ?? change.old_path,
        language: detectLanguage(change.new_path ?? change.old_path),
        diff: annotateDiffWithLineNumbers(change.diff ?? ''),
      }));
  }

  async postReviewComments(
    projectId: string,
    mrId: string,
    comments: ReviewComment[],
  ): Promise<void> {
    const rawMr = (await this.client.getMergeRequest(
      projectId,
      mrId,
    )) as RawMergeRequest;
    const diffRefs = rawMr.diff_refs;

    for (const comment of comments) {
      const position: Record<string, unknown> = {
        position_type: 'text',
        new_path: comment.file,
        new_line: comment.line,
      };
      if (diffRefs) {
        position.base_sha = diffRefs.base_sha;
        position.head_sha = diffRefs.head_sha;
        position.start_sha = diffRefs.start_sha;
      }
      await this.client.postDiscussion(
        projectId,
        mrId,
        comment.comment,
        position,
      );
    }
  }
}

function isBinaryOrExcluded(change: RawChange): boolean {
  // Binary files have an empty diff without being new/deleted/renamed
  if (
    change.diff === '' &&
    !change.new_file &&
    !change.deleted_file &&
    !change.renamed_file
  ) {
    return true;
  }

  // Large diffs (>200KB)
  if (change.diff && change.diff.length > 200 * 1024) {
    return true;
  }

  // Lock files
  const lockFileNames = [
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Gemfile.lock',
    'Pipfile.lock',
    'poetry.lock',
    'composer.lock',
    'go.sum',
  ];

  const filePath = change.new_path ?? change.old_path ?? '';
  const fileName = filePath.split('/').pop() ?? '';

  if (lockFileNames.includes(fileName)) {
    return true;
  }

  return false;
}
