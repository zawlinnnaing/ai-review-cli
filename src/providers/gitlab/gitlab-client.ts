import axios, { AxiosInstance } from 'axios';

export class GitLabClient {
  private client: AxiosInstance;

  constructor(baseUrl: string, token: string) {
    this.client = axios.create({
      baseURL: `${baseUrl.replace(/\/$/, '')}/api/v4`,
      headers: {
        'PRIVATE-TOKEN': token,
        'Content-Type': 'application/json',
      },
    });
  }

  async getMergeRequest(projectId: string, mrIid: string): Promise<unknown> {
    const encodedProjectId = encodeURIComponent(projectId);
    const response = await this.client.get(
      `/projects/${encodedProjectId}/merge_requests/${mrIid}`,
    );
    return response.data;
  }

  async getMergeRequestDiffs(
    projectId: string,
    mrIid: string,
  ): Promise<unknown[]> {
    const encodedProjectId = encodeURIComponent(projectId);
    const allDiffs: unknown[] = [];
    let page = 1;

    while (true) {
      const response = await this.client.get(
        `/projects/${encodedProjectId}/merge_requests/${mrIid}/diffs`,
        { params: { page, per_page: 20 } },
      );
      const diffs = response.data as unknown[];
      allDiffs.push(...diffs);

      const nextPage = response.headers['x-next-page'];
      if (!nextPage) break;
      page = parseInt(nextPage, 10);
    }

    return allDiffs;
  }

  async getFileContent(
    projectId: string,
    ref: string,
    filePath: string,
  ): Promise<string> {
    const encodedProjectId = encodeURIComponent(projectId);
    const encodedFilePath = encodeURIComponent(filePath);
    try {
      const response = await this.client.get(
        `/projects/${encodedProjectId}/repository/files/${encodedFilePath}/raw`,
        { params: { ref }, responseType: 'text' },
      );
      return response.data as string;
    } catch {
      return '';
    }
  }

  async postDiscussion(
    projectId: string,
    mrIid: string,
    body: string,
    position?: Record<string, unknown>,
  ): Promise<unknown> {
    const encodedProjectId = encodeURIComponent(projectId);
    const payload: Record<string, unknown> = { body };
    if (position) {
      payload.position = position;
    }
    const response = await this.client.post(
      `/projects/${encodedProjectId}/merge_requests/${mrIid}/discussions`,
      payload,
    );
    return response.data;
  }
}
