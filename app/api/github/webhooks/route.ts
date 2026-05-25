import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { parseGitHubUrl } from '@/lib/github';

export const dynamic = 'force-dynamic';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON request body.' }, { status: 400 });
    }

    const { repoUrl } = body;
    if (!repoUrl || typeof repoUrl !== 'string') {
      return Response.json({ error: 'Missing required field: repoUrl' }, { status: 400 });
    }

    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return Response.json({ error: 'Invalid GitHub URL.' }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const repoFullName = `${owner}/${repo}`;

    // Get GitHub token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_token')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.github_token) {
      return Response.json({ error: 'GitHub account not connected.' }, { status: 400 });
    }

    // Check if we already monitor this repo
    const { data: existing } = await supabase
      .from('monitored_repos')
      .select('*')
      .eq('user_id', user.id)
      .eq('repo_full_name', repoFullName)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return Response.json({ message: 'Repository is already monitored.', monitored: existing }, { status: 200 });
    }

    const webhookSecret = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/api/github/events`;

    // Create webhook on GitHub
    const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        'User-Agent': 'ARKOS-Security-Scanner',
        'Accept': 'application/vnd.github+json',
        'Authorization': `token ${profile.github_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push'],
        config: {
          url: callbackUrl,
          content_type: 'json',
          secret: webhookSecret,
        },
      }),
    });

    if (!ghRes.ok) {
      const errText = await ghRes.text();
      console.error('[Webhooks API] GitHub hook creation failed:', ghRes.status, errText);
      return Response.json({ error: `GitHub webhook creation failed: ${ghRes.statusText}` }, { status: ghRes.status });
    }

    const ghHook = await ghRes.json();

    // Store in DB
    const { data: monitored, error: dbError } = await supabase
      .from('monitored_repos')
      .insert({
        user_id: user.id,
        repo_full_name: repoFullName,
        repo_url: repoUrl,
        github_webhook_id: ghHook.id,
        webhook_secret: webhookSecret,
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Webhooks API] Failed to save monitored repo to DB:', dbError);
      return Response.json({ error: 'Failed to record monitored repository.' }, { status: 500 });
    }

    return Response.json({ message: 'Webhook successfully registered.', monitored }, { status: 201 });
  } catch (err) {
    console.error('[Webhooks API] Unexpected error in POST:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: monitored, error: dbError } = await supabase
      .from('monitored_repos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (dbError) {
      console.error('[Webhooks API] Failed to fetch monitored repos:', dbError);
      return Response.json({ error: 'Failed to fetch monitored repositories.' }, { status: 500 });
    }

    return Response.json({ monitored });
  } catch (err) {
    console.error('[Webhooks API] Unexpected error in GET:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return Response.json({ error: 'Missing monitored repo id parameter.' }, { status: 400 });
    }

    const { data: monitored, error: dbError } = await supabase
      .from('monitored_repos')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError || !monitored) {
      return Response.json({ error: 'Monitored repository not found.' }, { status: 404 });
    }

    // Get GitHub token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_token')
      .eq('id', user.id)
      .single();

    if (!profileError && profile && profile.github_token && monitored.github_webhook_id) {
      const parsed = parseGitHubUrl(monitored.repo_url);
      if (parsed) {
        const { owner, repo } = parsed;
        const ghRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/hooks/${monitored.github_webhook_id}`, {
          method: 'DELETE',
          headers: {
            'User-Agent': 'ARKOS-Security-Scanner',
            'Accept': 'application/vnd.github+json',
            'Authorization': `token ${profile.github_token}`,
          },
        });
        if (!ghRes.ok) {
          console.warn('[Webhooks API] GitHub hook deletion warning or failure:', ghRes.status, ghRes.statusText);
        }
      }
    }

    const { error: deleteError } = await supabase
      .from('monitored_repos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[Webhooks API] Failed to delete monitored repo:', deleteError);
      return Response.json({ error: 'Failed to delete monitored repository from database.' }, { status: 500 });
    }

    return Response.json({ success: true, message: 'Repository unmonitored.' });
  } catch (err) {
    console.error('[Webhooks API] Unexpected error in DELETE:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
