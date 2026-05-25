import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { status, status_note } = await req.json();

  const validStatuses = ['open', 'accepted', 'false_positive'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('findings')
    .update({
      status,
      status_note,
      resolved_at: status !== 'open' ? new Date().toISOString() : null,
    })
    .eq('id', params.id)
    .eq('user_id', user.id) // RLS also enforces this but explicit is safer
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  return NextResponse.json({ finding: data });
}
