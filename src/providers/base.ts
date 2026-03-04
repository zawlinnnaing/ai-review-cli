export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  description: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface FileDiff {
  path: string;
  language?: string;
  diff: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'critical' | 'warning' | 'suggestion';
  comment: string;
}

export interface GitProvider {
  getMergeRequest(projectId: string, mrId: string): Promise<MergeRequest>;

  getMergeRequestChanges(projectId: string, mrId: string): Promise<FileDiff[]>;

  postReviewComments(
    projectId: string,
    mrId: string,
    comments: ReviewComment[],
  ): Promise<void>;

  updateDescription(
    projectId: string,
    mrId: string,
    description: string,
  ): Promise<void>;
}
