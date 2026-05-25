import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { parseGitHubUrl } from '@/lib/github';
import { getScanQueue } from '@/lib/queue/scanQueue';
import { checkScanLimit } from '@/lib/ratelimit';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Upstash sliding-window rate limit check
    const limitCheck = await checkScanLimit(user.id);
    if (!limitCheck.success) {
      return Response.json({
        error: 'Rate limit exceeded. You are limited to 10 scans per day.'
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limitCheck.limit),
          'X-RateLimit-Remaining': String(limitCheck.remaining),
          'X-RateLimit-Reset': String(limitCheck.reset)
        }
      });
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
      return Response.json({
        error: 'Invalid GitHub URL. Must be a valid public GitHub repository (e.g., https://github.com/owner/repo).'
      }, { status: 400 });
    }

    const { owner, repo } = parsed;

    // Insert new scan record in Supabase database
    const { data: scanRow, error: insertError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        repo_url: repoUrl,
        repo_name: `${owner}/${repo}`,
        status: 'pending',
        findings: [],
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        low_count: 0,
        risk_score: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API Scans] Failed to insert scan row:', insertError);
      return Response.json({ error: 'Failed to create scan in the database.' }, { status: 500 });
    }

    // Add job to BullMQ queue
    try {
      const queue = getScanQueue();
      await queue.add('scan', { scanId: scanRow.id, repoUrl });
      console.log(`[API Scans] Job added to queue for scan: ${scanRow.id}`);
    } catch (queueErr) {
      console.error('[API Scans] Failed to push job to BullMQ queue:', queueErr);
      // We will keep the row but notify that background queue is not available (Redis down)
      return Response.json({
        error: 'Scan registered, but background worker queue is currently offline. Please ensure Redis is running.',
        scan: scanRow
      }, { status: 202 });
    }

    return Response.json({ scan: scanRow }, { status: 201 });
  } catch (err) {
    console.error('[API Scans] Unexpected error in POST handler:', err);
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

    // RLS policy will automatically restrict results to the current user's scans
    const { data: scans, error: fetchError } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('[API Scans] Failed to fetch scans:', fetchError);
      return Response.json({ error: 'Failed to fetch scans from the database.' }, { status: 500 });
    }

    return Response.json({ scans });
  } catch (err) {
    console.error('[API Scans] Unexpected error in GET handler:', err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
