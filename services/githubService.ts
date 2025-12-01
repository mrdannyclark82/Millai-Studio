

// Simple interface for file tree items
export interface GitHubNode {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

const STORAGE_KEY_TOKEN = 'milla_github_token';

export class GitHubService {
  
  constructor() {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (token) {
      this.initialize(token);
    }
  }

  initialize(token: string) {
    // We use the CDN version of octokit or raw fetch if simple. 
    // Since we don't have octokit in importmap, let's use raw fetch for zero-dep.
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  }

  getToken() {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }

  clearToken() {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }

  // Parse "owner/repo" string
  parseRepoString(input: string) {
    const parts = input.replace('https://github.com/', '').split('/');
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  }

  async fetchRepoContents(owner: string, repo: string, path: string = ''): Promise<GitHubNode[]> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Repository not found or private (add token).");
        if (res.status === 403) throw new Error("Rate limit exceeded or invalid token.");
        throw new Error("Failed to fetch repository.");
      }

      const data = await res.json();
      
      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          path: item.path,
          mode: item.mode || '100644',
          type: item.type === 'dir' ? 'tree' : 'blob',
          sha: item.sha,
          size: item.size,
          url: item.download_url || item.url
        }));
      }
      return []; // It was a single file if not array, handled elsewhere
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async fetchFileContent(url: string): Promise<string> {
    const token = this.getToken();
    const headers: HeadersInit = {};
    if (token && url.includes('api.github.com')) {
       // If using API url, we need auth header and raw accept
       headers['Authorization'] = `token ${token}`;
       headers['Accept'] = 'application/vnd.github.v3.raw';
    }

    // Standard fetch
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error("Failed to load file content");
    return await res.text();
  }
}

export const githubService = new GitHubService();