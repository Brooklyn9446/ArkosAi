import { Resend } from 'resend';

// Only instantiate Resend if the API key is present to prevent throw
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendCriticalFindingAlert(
  userEmail: string,
  repoName: string,
  scanId: string,
  criticalCount: number,
  highCount: number,
  topFindings: { title: string; file_path: string; severity: string }[]
) {
  // Only send email if there are critical or high findings.
  if (criticalCount === 0 && highCount === 0) return;

  if (!resend || !process.env.RESEND_FROM_EMAIL) {
    console.warn('[ARKOS] Alert email skipped (missing RESEND_API_KEY or RESEND_FROM_EMAIL).');
    return;
  }

  const findingLines = topFindings
    .slice(0, 5)
    .map(f => `${f.severity.toUpperCase()} — ${f.title} in ${f.file_path}`)
    .join('\n');

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: userEmail,
      subject: `ARKOS — ${criticalCount > 0 ? `${criticalCount} critical` : `${highCount} high`} findings in ${repoName}`,
      text: `
ARKOS Security Analysis Complete

Repository: ${repoName}
Critical findings: ${criticalCount}
High findings: ${highCount}

Top findings:
${findingLines}

View full report:
${appUrl}/scan/${scanId}

---
You are receiving this because you have an ARKOS account.
      `.trim(),
    });
    console.log(`[ARKOS] Alert email sent successfully to ${userEmail}`);
  } catch (err) {
    console.error('[ARKOS] Failed to send scan alert email:', err);
  }
}
