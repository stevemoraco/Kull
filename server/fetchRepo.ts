// Fetch and cache GitHub repository content
interface RepoFile {
  path: string;
  content: string;
  type: string;
}

interface RepoCache {
  content: string;
  timestamp: number;
}

// Cache repo content in memory (per session)
const repoCache = new Map<string, RepoCache>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchGitHubRepo(owner: string, repo: string, branch: string = 'main'): Promise<RepoFile[]> {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Kull-AI-Support-Bot',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = await response.json();
  const files: RepoFile[] = [];

  // Filter for relevant files (code, configs, docs)
  const relevantExtensions = ['.tsx', '.ts', '.jsx', '.js', '.md', '.json', '.yml', '.yaml'];
  const excludePaths = ['node_modules', '.cache', 'dist', 'build', '.git', 'coverage'];

  for (const item of data.tree) {
    if (item.type === 'blob') {
      const shouldInclude = relevantExtensions.some(ext => item.path.endsWith(ext));
      const shouldExclude = excludePaths.some(dir => item.path.includes(dir));

      if (shouldInclude && !shouldExclude) {
        try {
          // Fetch individual file content
          const fileResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${item.path}?ref=${branch}`,
            {
              headers: {
                'Accept': 'application/vnd.github.v3.raw',
                'User-Agent': 'Kull-AI-Support-Bot',
              },
            }
          );

          if (fileResponse.ok) {
            const content = await fileResponse.text();
            files.push({
              path: item.path,
              content,
              type: item.path.split('.').pop() || 'txt',
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch ${item.path}:`, error);
        }
      }
    }
  }

  return files;
}

function formatRepoAsMarkdown(files: RepoFile[]): string {
  let markdown = '# Kull AI Repository Code\n\n';
  markdown += 'Complete codebase from github.com/stevemoraco/kull\n\n';

  // Group files by directory
  const grouped = new Map<string, RepoFile[]>();

  for (const file of files) {
    const dir = file.path.split('/').slice(0, -1).join('/') || 'root';
    if (!grouped.has(dir)) {
      grouped.set(dir, []);
    }
    grouped.get(dir)!.push(file);
  }

  // Format each file
  for (const [dir, dirFiles] of Array.from(grouped.entries())) {
    markdown += `\n## Directory: ${dir}\n\n`;

    for (const file of dirFiles) {
      markdown += `### File: ${file.path}\n\n`;
      markdown += '```' + file.type + '\n';
      markdown += file.content.slice(0, 5000); // Limit file size to prevent token overflow
      if (file.content.length > 5000) {
        markdown += '\n... [content truncated]\n';
      }
      markdown += '\n```\n\n';
    }
  }

  return markdown;
}

export async function getRepoContent(sessionId: string = 'default'): Promise<string> {
  // Check cache
  const cached = repoCache.get(sessionId);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('[Repo] Using cached content');
    return cached.content;
  }

  console.log('[Repo] Fetching fresh content from GitHub...');

  try {
    const files = await fetchGitHubRepo('stevemoraco', 'kull');
    const markdown = formatRepoAsMarkdown(files);

    // Cache the result
    repoCache.set(sessionId, {
      content: markdown,
      timestamp: Date.now(),
    });

    console.log(`[Repo] Fetched ${files.length} files, ${markdown.length} characters`);
    return markdown;
  } catch (error) {
    console.error('[Repo] Failed to fetch:', error);

    // Return cached content if available, even if expired
    if (cached) {
      console.log('[Repo] Using stale cache due to fetch error');
      return cached.content;
    }

    // Fallback to basic content
    return '# Kull AI\n\nUnable to fetch repository content. Using basic information.\n\nKull AI is a universal Mac/iPhone/iPad app for AI-powered photo rating and organization.';
  }
}

// Clear old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(repoCache.entries())) {
    if (now - value.timestamp > CACHE_DURATION * 2) {
      repoCache.delete(key);
    }
  }
}, CACHE_DURATION);
