import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all trends for the current user in one query
    const { data: trends, error: fetchError } = await supabase
      .from('scan_trends')
      .select('*')
      .eq('user_id', user.id)
      .order('scanned_at', { ascending: true });

    if (fetchError) {
      console.error('[API Trends Bulk] Failed to fetch trends:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch trends from the database.' }, { status: 500 });
    }

    return NextResponse.json({ trends: trends ?? [] });
  } catch (err: any) {
    console.error('[API Trends Bulk] Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
