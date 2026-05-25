import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const category = searchParams.get('category');

  let query = supabase
    .from('findings')
    .select('*, scans(repo_name)')
    .eq('user_id', user.id)
    .order('first_seen_at', { ascending: false });

  if (status && status !== 'all') query = query.eq('status', status);
  if (severity && severity !== 'all') query = query.eq('severity', severity);
  if (category && category !== 'all') query = query.eq('category', category);

  const { data: findings, error } = await query;

  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  return NextResponse.json({ findings: findings ?? [] });
}
