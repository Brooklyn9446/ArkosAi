import { fetchRepositoryFiles, parseGitHubUrl } from '../github';
import { scanFilesForSecrets } from '../agents/secrets';
import { runOwaspAgent } from '../agents/owaspAgent';
import { runDependencyAgent } from '../agents/dependencyAgent';
import { runAuthAgent } from '../agents/authAgent';
import { Finding } from '../types/database';
import { supabaseAdmin } from '../supabase/admin';
import { generateFingerprint } from '../fingerprint/generateFingerprint';
import { runTrendAgent, PreviousScanSummary } from '../agents/trendAgent';

export type ScanProgress = {
  stage: string;
  message: string;
  completedAgents: string[];
};

type ProgressCallback = (progress: ScanProgress) => void;

export async function runFullScan(
  repoUrl: string,
  onProgress: ProgressCallback,
  scanId?: string,
  userId?: string
): Promise<{
  findings: Finding[];
  riskScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalFilesScanned: number;
}> {
  // Stage 1: Fetch files
  onProgress({
    stage: 'fetching',
    message: 'Fetching repository files from GitHub...',
    completedAgents: [],
  });

  const files = await fetchRepositoryFiles(repoUrl);

  onProgress({
    stage: 'scanning',
    message: `Fetched ${files.length} files. Running security agents in parallel...`,
    completedAgents: [],
  });

  // Stage 2: Run all four agents concurrently.
  const completedAgents: string[] = [];

  const [secretsResult, owaspResult, dependencyResult, authResult] =
    await Promise.allSettled([
      scanFilesForSecrets(files).then(findings => {
        completedAgents.push('secrets');
        onProgress({
          stage: 'scanning',
          message: `Secrets agent complete — ${findings.length} findings`,
          completedAgents: [...completedAgents],
        });
        return findings;
      }),
      runOwaspAgent(files).then(findings => {
        completedAgents.push('owasp');
        onProgress({
          stage: 'scanning',
          message: `OWASP agent complete — ${findings.length} findings`,
          completedAgents: [...completedAgents],
        });
        return findings;
      }),
      runDependencyAgent(files).then(findings => {
        completedAgents.push('dependency');
        onProgress({
          stage: 'scanning',
          message: `Dependency agent complete — ${findings.length} findings`,
          completedAgents: [...completedAgents],
        });
        return findings;
      }),
      runAuthAgent(files).then(findings => {
        completedAgents.push('auth');
        onProgress({
          stage: 'scanning',
          message: `Auth agent complete — ${findings.length} findings`,
          completedAgents: [...completedAgents],
        });
        return findings;
      }),
    ]);

  // Extract findings from settled promises, using empty arrays
  // as fallback for any agent that failed
  const allFindings: Finding[] = [
    ...(secretsResult.status === 'fulfilled' ? secretsResult.value : []),
    ...(owaspResult.status === 'fulfilled' ? owaspResult.value : []),
    ...(dependencyResult.status === 'fulfilled' ? dependencyResult.value : []),
    ...(authResult.status === 'fulfilled' ? authResult.value : []),
  ];

  // Stage 3: Calculate risk score
  const criticalCount = allFindings.filter(f => f.severity === 'critical').length;
  const highCount = allFindings.filter(f => f.severity === 'high').length;
  const mediumCount = allFindings.filter(f => f.severity === 'medium').length;
  const lowCount = allFindings.filter(f => f.severity === 'low').length;

  const rawScore = (criticalCount * 10) + (highCount * 7) + (mediumCount * 4) + (lowCount * 1);
  const riskScore = Math.min(100, rawScore);

  onProgress({
    stage: 'complete',
    message: `Analysis complete. Found ${allFindings.length} total issues.`,
    completedAgents: ['secrets', 'owasp', 'dependency', 'auth'],
  });

  // Call persistFindings if scanId and userId are provided
  if (scanId && userId) {
    const parsedUrl = parseGitHubUrl(repoUrl);
    const repoName = parsedUrl ? `${parsedUrl.owner}/${parsedUrl.repo}` : 'unknown';
    await persistFindings(scanId, userId, repoName, allFindings);
  }

  return {
    findings: allFindings,
    riskScore,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalFilesScanned: files.length,
  };
}

// Call this at the end of runFullScan, after collecting allFindings.
// It handles deduplication, persistence, and trend calculation.
export async function persistFindings(
  scanId: string,
  userId: string,
  repoName: string,
  findings: Finding[]
) {
  // Step 1: Fetch previous findings for this user+repo combination
  // to determine which findings are new, recurring, or fixed.
  const repoPart = repoName.includes('/') ? repoName.split('/')[1] : repoName;
  const { data: existingFindings } = await supabaseAdmin
    .from('findings')
    .select('fingerprint, recurrence_count, status, first_seen_at')
    .eq('user_id', userId)
    .ilike('file_path', `%${repoPart}%`)
    .eq('status', 'open');

  const existingByFingerprint = new Map(
    (existingFindings ?? []).map(f => [f.fingerprint, f])
  );

  // Step 2: Process each finding — determine if it's new or recurring.
  let newCount = 0;
  let recurringCount = 0;

  for (const finding of findings) {
    const fingerprint = generateFingerprint(userId, repoName, finding);
    const existing = existingByFingerprint.get(fingerprint);

    if (existing) {
      // Finding already exists — increment recurrence count and
      // update last_seen_at to show it appeared in this scan too.
      recurringCount++;
      await supabaseAdmin
        .from('findings')
        .update({
          last_seen_at: new Date().toISOString(),
          recurrence_count: existing.recurrence_count + 1,
          scan_id: scanId, // update to point to most recent scan
        })
        .eq('fingerprint', fingerprint)
        .eq('user_id', userId);

    } else {
      // Brand new finding — insert it fresh.
      newCount++;
      // Exclude findings custom non-UUID string id before insertion
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, ...findingData } = finding;
      await supabaseAdmin.from('findings').insert({
        scan_id: scanId,
        user_id: userId,
        fingerprint,
        ...findingData,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        recurrence_count: 1,
        status: 'open',
      });
    }
  }

  // Step 3: Determine how many previously open findings did NOT
  // appear in this scan — those have been fixed.
  const currentFingerprints = new Set(
    findings.map(f => generateFingerprint(userId, repoName, f))
  );

  let fixedCount = 0;
  for (const fp of Array.from(existingByFingerprint.keys())) {
    if (!currentFingerprints.has(fp)) {
      fixedCount++;
      await supabaseAdmin
        .from('findings')
        .update({
          status: 'fixed',
          resolved_at: new Date().toISOString(),
        })
        .eq('fingerprint', fp)
        .eq('user_id', userId);
    }
  }

  // Step 4: Fetch previous scan summaries for trend analysis.
  const { data: previousTrends } = await supabaseAdmin
    .from('scan_trends')
    .select('scanned_at, risk_score, total_findings, critical_count, high_count')
    .eq('user_id', userId)
    .eq('repo_name', repoName)
    .order('scanned_at', { ascending: false })
    .limit(5);

  // Step 5: Run the trend agent with the historical context.
  const trendAnalysis = await runTrendAgent(
    findings.map(f => ({
      title: f.title,
      severity: f.severity,
      category: f.category,
      file_path: f.file_path ?? '',
    })),
    (previousTrends ?? []) as PreviousScanSummary[],
    repoName,
    newCount,
    fixedCount,
    recurringCount,
  );

  // Step 6: Save this scan's summary to scan_trends for future
  // trend analysis — this scan becomes the "previous scan" for
  // the next time this repo is analysed.
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;
  const riskScore = Math.min(100,
    criticalCount * 10 + highCount * 7 + mediumCount * 4 + lowCount * 1
  );

  await supabaseAdmin.from('scan_trends').insert({
    scan_id: scanId,
    user_id: userId,
    repo_name: repoName,
    scanned_at: new Date().toISOString(),
    risk_score: riskScore,
    critical_count: criticalCount,
    high_count: highCount,
    medium_count: mediumCount,
    low_count: lowCount,
    total_findings: findings.length,
    new_findings: newCount,
    fixed_findings: fixedCount,
    recurring_findings: recurringCount,
  });

  // Step 7: Update the scan record with the trend narrative
  // so the frontend can display it in the report header.
  await supabaseAdmin
    .from('scans')
    .update({
      trend_narrative: trendAnalysis.narrative,
      trend_direction: trendAnalysis.trendDirection,
    })
    .eq('id', scanId);

  return trendAnalysis;
}
