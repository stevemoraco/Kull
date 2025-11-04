// Fetch and cache GitHub repository content
import { db } from './db';
import { repoContentCache } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface RepoFile {
  path: string;
  content: string;
  type: string;
}

interface RepoCache {
  content: string;
  timestamp: number;
}

// In-memory fallback cache (for emergency use only)
const fallbackCache = new Map<string, RepoCache>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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

export async function getRepoContent(repoName: string = 'stevemoraco/kull'): Promise<string> {
  try {
    // Step 1: Check database cache
    const cached = await db
      .select()
      .from(repoContentCache)
      .where(eq(repoContentCache.repo, repoName))
      .limit(1);

    const now = Date.now();
    const cachedEntry = cached[0];

    // If cache is fresh (less than 1 hour old), use it
    if (cachedEntry && now - cachedEntry.lastFetchedAt.getTime() < CACHE_DURATION) {
      console.log('[Repo] Using database cached content');

      // Also update fallback cache
      fallbackCache.set(repoName, {
        content: cachedEntry.content,
        timestamp: cachedEntry.lastFetchedAt.getTime(),
      });

      return cachedEntry.content;
    }

    // Step 2: Cache is stale or doesn't exist - fetch fresh content
    console.log('[Repo] Fetching fresh content from GitHub...');
    const [owner, repo] = repoName.split('/');
    const files = await fetchGitHubRepo(owner, repo);
    const markdown = formatRepoAsMarkdown(files);

    // Step 3: Update database cache
    if (cachedEntry) {
      // Update existing entry
      await db
        .update(repoContentCache)
        .set({
          content: markdown,
          fileCount: files.length,
          characterCount: markdown.length,
          lastFetchedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(repoContentCache.repo, repoName));
      console.log(`[Repo] Updated cache: ${files.length} files, ${markdown.length} characters`);
    } else {
      // Create new entry
      await db.insert(repoContentCache).values({
        repo: repoName,
        content: markdown,
        fileCount: files.length,
        characterCount: markdown.length,
        lastFetchedAt: new Date(),
      });
      console.log(`[Repo] Created cache: ${files.length} files, ${markdown.length} characters`);
    }

    // Update fallback cache
    fallbackCache.set(repoName, {
      content: markdown,
      timestamp: now,
    });

    return markdown;
  } catch (error) {
    console.error('[Repo] Failed to fetch from GitHub:', error);

    // Step 4: Try database cache even if stale
    try {
      const staleCache = await db
        .select()
        .from(repoContentCache)
        .where(eq(repoContentCache.repo, repoName))
        .limit(1);

      if (staleCache[0]) {
        console.log('[Repo] Using stale database cache due to fetch error');
        return staleCache[0].content;
      }
    } catch (dbError) {
      console.error('[Repo] Database cache access failed:', dbError);
    }

    // Step 5: Try fallback in-memory cache
    const fallback = fallbackCache.get(repoName);
    if (fallback) {
      console.log('[Repo] Using fallback in-memory cache');
      return fallback.content;
    }

    // Step 6: Ultimate fallback
    console.warn('[Repo] All cache attempts failed, using basic fallback');
    return '# Kull AI\n\nUnable to fetch repository content. Using basic information.\n\nKull AI is a universal Mac/iPhone/iPad app for AI-powered photo rating and organization.';
  }
}

// Function to refresh cache (called by cron job)
export async function refreshRepoCache(repoName: string = 'stevemoraco/kull'): Promise<void> {
  console.log(`[Repo] Starting scheduled cache refresh for ${repoName}`);
  try {
    await getRepoContent(repoName);
    console.log('[Repo] Scheduled cache refresh completed');
  } catch (error) {
    console.error('[Repo] Scheduled cache refresh failed:', error);
  }
}
