import { supabaseAdmin } from '../supabase/admin';
import { fetchRepositoryFiles } from '../github';
import { scanFilesForSecrets } from '../agents/secrets';

export async function processScanJob(scanId: string, repoUrl: string): Promise<void> {
  console.log(`[Processor] Processing scan ${scanId} for URL ${repoUrl}`);

  // 1. Transition scan status to running
  const { error: runError } = await supabaseAdmin
    .from('scans')
    .update({ status: 'running' })
    .eq('id', scanId);

  if (runError) {
    console.error(`[Processor] Failed to set status to running: ${runError.message}`);
    return;
  }

  try {
    // 2. Fetch files from GitHub
    console.log(`[Processor] Fetching files from GitHub for ${repoUrl}...`);
    const files = await fetchRepositoryFiles(repoUrl);
    console.log(`[Processor] Fetched ${files.length} scannable files.`);

    if (files.length === 0) {
      throw new Error('No scannable files found in this repository. Verify the repo is public and contains source code.');
    }

    // 3. Scan files using secrets agent
    console.log(`[Processor] Running Secrets & Credentials scanning agent...`);
    const findings = await scanFilesForSecrets(files);
    console.log(`[Processor] Scanning complete. Discovered ${findings.length} findings.`);

    // 4. Calculate counts and risk score
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    findings.forEach((finding) => {
      if (finding.severity === 'critical') criticalCount++;
      else if (finding.severity === 'high') highCount++;
      else if (finding.severity === 'medium') mediumCount++;
      else if (finding.severity === 'low') lowCount++;
    });

    const rawScore = (criticalCount * 10) + (highCount * 7) + (mediumCount * 4) + (lowCount * 1);
    const riskScore = Math.min(100, rawScore);

    // 5. Update scans database row to complete
    const { error: completeError } = await supabaseAdmin
      .from('scans')
      .update({
        status: 'complete',
        findings,
        critical_count: criticalCount,
        high_count: highCount,
        medium_count: mediumCount,
        low_count: lowCount,
        risk_score: riskScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', scanId);

    if (completeError) {
      throw new Error(`Failed to save findings: ${completeError.message}`);
    }

    console.log(`[Processor] Scan ${scanId} completed successfully.`);
  } catch (err: any) {
    console.error(`[Processor] Error during scan job: ${err.message || err}`);
    
    // Update status to failed
    const { error: failError } = await supabaseAdmin
      .from('scans')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', scanId);

    if (failError) {
      console.error(`[Processor] Failed to set status to failed: ${failError.message}`);
    }
  }
}
