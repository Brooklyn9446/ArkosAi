export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\/$/, '').replace(/\.git$/, ''); //removes the trailing slash first and .git
    const parsed = new URL(cleaned);
    if (parsed.hostname !== 'github.com' && !parsed.hostname.endsWith('.github.com')) {
      return null;
    }
    const parts = parsed.pathname.split('/').filter(Boolean); //split based on / and then filter the values for which the Bolean value is false Eg " "
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

export function isScannableFile(path: string, size = 0): boolean {
  const pathLower = path.toLowerCase();

  // Size limit: 300KB
  if (size > 300 * 1024) return false;

  // Exclude directories/patterns
  const excludePatterns = [
    'node_modules/',
    '.git/',
    '.next/',
    'dist/',
    'build/',
    'out/',
    'target/',
    'vendor/',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'cargo.lock',
    'go.sum',
    'composer.lock',
    'gradle-wrapper.jar'
  ];
  if (excludePatterns.some(p => pathLower.includes(p))) return false; //checks if any of the patterns are in the path

  // List of scannable extensions
  const scannableExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.rb', '.php', '.go', '.rs', '.java', '.kt',
    '.c', '.cpp', '.h', '.hpp', '.cs',
    '.env', '.env.example', '.json', '.yaml', '.yml', '.xml', '.toml', '.ini', '.conf'
  ];
  return scannableExtensions.some(ext => pathLower.endsWith(ext));
}

export interface GitHubFile {
  path: string;
  content: string;
}

export async function fetchRepositoryFiles(repoUrl: string): Promise<GitHubFile[]> {
  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL.');
  }

  const { owner, repo } = parsed;
  const token = process.env.GITHUB_TOKEN;

  const headers: HeadersInit = {
    'User-Agent': 'ARKOS-Security-Scanner',
    'Accept': 'application/vnd.github+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  // 1. Get default branch
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`Repository "${owner}/${repo}" not found or is private.`);
    }
    throw new Error(`Failed to fetch repository metadata: ${repoRes.statusText}`);
  }
  const repoData = await repoRes.json();
  const branch = repoData.default_branch || 'main';

  // 2. Fetch recursive file tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=true`,
    { headers }
  );
  if (!treeRes.ok) {
    throw new Error(`Failed to fetch repository tree: ${treeRes.statusText}`);
  }
  const treeData = await treeRes.json();

  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    throw new Error('Invalid repository tree structure returned from GitHub.');
  }

  // 3. Filter files
  const scannableFiles = treeData.tree.filter((item: any) =>
    item.type === 'blob' && isScannableFile(item.path, item.size)
  );

  // Limit to first 50 files for safety and budget reasons
  const filesToScan = scannableFiles.slice(0, 50);

  // 4. Fetch content for each file
  const results: GitHubFile[] = [];
  for (const file of filesToScan) { //For each file which is scannable we make a request to the blob URL
    try {
      const blobRes = await fetch(file.url, { headers });
      if (!blobRes.ok) {
        console.warn(`[GitHub Fetcher] Failed to fetch content for ${file.path}: ${blobRes.statusText}`);
        continue;
      }
      const blobData = await blobRes.json();
      if (blobData.encoding === 'base64') {
        const content = Buffer.from(blobData.content, 'base64').toString('utf8'); //buffer converts the content which is encoded in base64 to byted which is then converted to utf-8 string
        results.push({ path: file.path, content });
      } else {
        results.push({ path: file.path, content: blobData.content || '' });
      }
    } catch (err) {
      console.warn(`[GitHub Fetcher] Error fetching content for ${file.path}:`, err);
    }
  }

  return results;
}
