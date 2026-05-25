import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { repoName: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Decode the repo name from the URL parameter
  // e.g. "Brooklyn9446-Sentinel" → "Brooklyn9446/Sentinel"
  const decoded = decodeURIComponent(params.repoName);
  const repoName = decoded.includes('/') ? decoded : decoded.replace('-', '/');

  const { data: trends } = await supabase
    .from('scan_trends')
    .select('*')
    .eq('user_id', user.id)
    .eq('repo_name', repoName)
    .order('scanned_at', { ascending: true })
    .limit(20);

  return NextResponse.json({ trends: trends ?? [] });
}
