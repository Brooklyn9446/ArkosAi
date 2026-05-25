import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile containing github_token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.github_token) {
      return Response.json({ error: 'GitHub account not connected. Please login with GitHub.' }, { status: 400 });
    }

    // Query GitHub API for user's own repositories
    const response = await fetch('https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100', {
      headers: {
        'User-Agent': 'ARKOS-Security-Scanner',
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${profile.github_token}`,
      },
    });

    if (!response.ok) {
      console.error('[API GitHub Repos] GitHub request failed:', response.status, response.statusText);
      return Response.json({ error: 'Failed to fetch repositories from GitHub.' }, { status: response.status });
    }

    const repos = await response.json() as GitHubRepository[];

    // Map to safe subset
    const safeRepos = repos.map((repo: GitHubRepository) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url,
      description: repo.description,
      default_branch: repo.default_branch,
      updated_at: repo.updated_at,
    }));

    return Response.json({ repositories: safeRepos });
  } catch (err) {
    console.error('[API GitHub Repos] Unexpected error:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
