import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFixAgent } from '@/lib/agents/fixAgent';
import { fetchRepositoryFiles } from '@/lib/github';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Fetch the finding and its parent scan in one query
  const { data: finding } = await supabase
    .from('findings')
    .select('*, scans(repo_url)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!finding) {
    return NextResponse.json({ error: 'Finding not found' }, { status: 404 });
  }

  // If a fix was already generated for this finding, return
  // the cached version immediately without calling Gemini again.
  if (finding.fix_diff) {
    return NextResponse.json({
      diff: finding.fix_diff,
      explanation: finding.fix_explanation,
      confidence: finding.fix_confidence,
      warnings: [],
      cached: true,
    });
  }

  // Fetch the specific file that contains the vulnerability
  // so the Fix Agent has full context for the surrounding code.
  let fileContent = '';
  const repoUrl = (finding.scans as any)?.repo_url;
  
  if (repoUrl && finding.file_path) {
    try {
      const files = await fetchRepositoryFiles(repoUrl);
      const targetFile = files.find(f => f.path === finding.file_path);
      fileContent = targetFile?.content ?? '';
    } catch (err) {
      console.warn(`[Fix Endpoint] Failed to fetch repository files:`, err);
      fileContent = finding.code_snippet ?? '';
    }
  } else {
    fileContent = finding.code_snippet ?? '';
  }

  const fix = await runFixAgent(finding, fileContent);

  // Cache the fix on the finding row so subsequent requests
  // for the same finding return instantly without an API call.
  await supabase
    .from('findings')
    .update({
      fix_diff: fix.diff,
      fix_explanation: fix.explanation,
      fix_confidence: fix.confidence,
      fix_generated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  return NextResponse.json(fix);
}
