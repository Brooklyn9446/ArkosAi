import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getScanQueue } from '@/lib/queue/scanQueue';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-hub-signature-256');
    const hookIdStr = req.headers.get('x-github-hook-id');
    const githubEvent = req.headers.get('x-github-event');

    if (!signature || !hookIdStr || !githubEvent) {
      return Response.json({ error: 'Missing required headers' }, { status: 400 });
    }

    if (githubEvent === 'ping') {
      return Response.json({ message: 'pong' }, { status: 200 });
    }

    if (githubEvent !== 'push') {
      return Response.json({ message: `Ignored event: ${githubEvent}` }, { status: 200 });
    }

    const hookId = parseInt(hookIdStr, 10);
    if (isNaN(hookId)) {
      return Response.json({ error: 'Invalid x-github-hook-id' }, { status: 400 });
    }

    // Lookup monitored repo
    const { data: monitored, error: dbError } = await supabaseAdmin
      .from('monitored_repos')
      .select('*')
      .eq('github_webhook_id', hookId)
      .eq('is_active', true)
      .maybeSingle();

    if (dbError || !monitored) {
      console.warn('[Webhooks Event] Webhook ID not found in monitored_repos:', hookId);
      return Response.json({ error: 'Webhook not registered or inactive' }, { status: 404 });
    }

    // Read raw body to verify signature
    const rawBody = await req.text();
    const hmac = crypto.createHmac('sha256', monitored.webhook_secret);
    const digest = 'sha256=' + hmac.update(rawBody).digest('hex');

    if (signature.length !== digest.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      console.error('[Webhooks Event] Signature verification failed');
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: 'Invalid payload JSON' }, { status: 400 });
    }

    const ref = payload.ref; // e.g. "refs/heads/main"
    const repoFullName = payload.repository?.full_name;
    const defaultBranch = payload.repository?.default_branch || 'main';
    const commitHash = payload.after;

    if (!ref) {
      return Response.json({ error: 'Missing ref in payload' }, { status: 400 });
    }

    // Check if push matches default branch
    if (ref !== `refs/heads/${defaultBranch}`) {
      return Response.json({ message: `Branch ${ref} is not the default branch ${defaultBranch}. Ignored.` }, { status: 200 });
    }

    // Create a pending scan in DB
    const { data: scanRow, error: insertError } = await supabaseAdmin
      .from('scans')
      .insert({
        user_id: monitored.user_id,
        repo_url: monitored.repo_url,
        repo_name: monitored.repo_full_name,
        repo_owner: repoFullName ? repoFullName.split('/')[0] : '',
        repo_branch: defaultBranch,
        status: 'pending',
        findings: [],
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        risk_score: null,
        triggered_by: 'webhook',
        commit_hash: commitHash || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Webhooks Event] Failed to create scan row:', insertError);
      return Response.json({ error: 'Failed to trigger scan' }, { status: 500 });
    }

    // Add job to BullMQ queue
    try {
      const queue = getScanQueue();
      await queue.add('scan', { scanId: scanRow.id, repoUrl: monitored.repo_url });
      console.log(`[Webhooks Event] Scan triggered via webhook push: ${scanRow.id}`);
    } catch (queueErr) {
      console.error('[Webhooks Event] Failed to queue webhook scan:', queueErr);
      return Response.json({
        message: 'Scan created, but background queue is offline.',
        scan: scanRow
      }, { status: 202 });
    }

    return Response.json({ success: true, scanId: scanRow.id });
  } catch (err) {
    console.error('[Webhooks Event] Unexpected error in receiver:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
