import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export type TrendAnalysis = {
  narrative: string;
  newFindingsCount: number;
  fixedFindingsCount: number;
  recurringFindingsCount: number;
  trendDirection: 'improving' | 'worsening' | 'stable' | 'first_scan';
};

export type PreviousScanSummary = {
  scanned_at: string;
  risk_score: number;
  total_findings: number;
  critical_count: number;
  high_count: number;
};

export async function runTrendAgent(
  currentFindings: { title: string; severity: string; category: string; file_path: string }[],
  previousScans: PreviousScanSummary[],
  repoName: string,
  newCount: number,
  fixedCount: number,
  recurringCount: number,
): Promise<TrendAnalysis> {

  // If this is the first scan for this repo, there is no trend
  // to analyse — return a first-scan response immediately without
  // calling Gemini, which saves a token call.
  if (previousScans.length === 0) {
    return {
      narrative: `This is the first security analysis for ${repoName}. ${currentFindings.length} issue${currentFindings.length !== 1 ? 's were' : ' was'} identified. Address the critical and high severity findings first to establish a strong security baseline.`,
      newFindingsCount: currentFindings.length,
      fixedFindingsCount: 0,
      recurringFindingsCount: 0,
      trendDirection: 'first_scan',
    };
  }

  // Determine trend direction from risk score history before
  // calling the AI so we can pass it in the prompt as context.
  const latestPrevious = previousScans[0];
  const currentRiskScore = currentFindings.length > 0
    ? Math.min(100,
        currentFindings.filter(f => f.severity === 'critical').length * 10 +
        currentFindings.filter(f => f.severity === 'high').length * 7 +
        currentFindings.filter(f => f.severity === 'medium').length * 4 +
        currentFindings.filter(f => f.severity === 'low').length * 1
      )
    : 0;

  const scoreDelta = currentRiskScore - latestPrevious.risk_score;
  const trendDirection =
    scoreDelta <= -5 ? 'improving' :
    scoreDelta >= 5  ? 'worsening' :
                       'stable';

  const prompt = `
You are a security analyst writing a brief trend summary for a developer
reviewing their repository's security history. Write 2-3 sentences maximum.
Be direct and specific. Do not use generic phrases like "it is important to".
Do not use emojis. Write in plain, professional English.

Repository: ${repoName}
Current scan: ${currentFindings.length} total findings
New findings since last scan: ${newCount}
Fixed since last scan: ${fixedCount}
Recurring unresolved findings: ${recurringCount}
Risk score change: ${scoreDelta > 0 ? '+' : ''}${scoreDelta.toFixed(0)} points

Previous scan history (most recent first):
${previousScans.slice(0, 5).map((s, i) =>
  `Scan ${i + 1}: ${s.total_findings} findings, risk score ${s.risk_score}, ${s.critical_count} critical`
).join('\n')}

Current findings by severity:
${['critical','high','medium','low'].map(sev => {
  const count = currentFindings.filter(f => f.severity === sev).length;
  return count > 0 ? `${sev}: ${count}` : null;
}).filter(Boolean).join(', ')}

Write a 2-3 sentence analyst commentary on the security trend.
Focus on what changed, whether things are improving or worsening,
and one specific actionable priority.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });

  return {
    narrative: response.text?.trim() ?? 'Trend analysis unavailable.',
    newFindingsCount: newCount,
    fixedFindingsCount: fixedCount,
    recurringFindingsCount: recurringCount,
    trendDirection,
  };
}
