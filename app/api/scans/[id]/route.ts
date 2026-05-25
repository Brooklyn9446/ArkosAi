import { createClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return Response.json({ error: 'Missing required parameter: id' }, { status: 400 });
    }

    const { data: scan, error: fetchError } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error(`[API Scan Detail] Failed to fetch scan ${id}:`, fetchError);
      return Response.json({ error: 'Scan not found or access denied.' }, { status: 404 });
    }

    // Fetch corresponding findings from findings table
    const { data: findings } = await supabase
      .from('findings')
      .select('*')
      .eq('scan_id', id);

    // Fetch corresponding trend summary
    const { data: trend } = await supabase
      .from('scan_trends')
      .select('*')
      .eq('scan_id', id)
      .maybeSingle();

    return Response.json({ 
      scan, 
      findings: findings ?? [], 
      trend: trend ?? null 
    });
  } catch (err: any) {
    console.error(`[API Scan Detail] Unexpected error in GET handler:`, err);
    return Response.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
