import { createHash } from 'crypto';
import { Finding } from '@/lib/types/database';

export function generateFingerprint(
  userId: string,
  repoName: string,
  finding: Finding
): string {
  // Concatenate the fields that uniquely identify this specific
  // vulnerability in this specific location. We deliberately exclude
  // fields that might change between scans without the vulnerability
  // actually changing — like the finding's generated ID or description
  // wording which AI might vary slightly between calls.
  const content = [
    userId,
    repoName,
    finding.file_path ?? 'unknown',
    String(finding.line_number ?? 0),
    finding.category,
    // Take only the first 100 characters of the code snippet
    // to avoid minor whitespace differences causing hash mismatches.
    (finding.code_snippet ?? '').trim().slice(0, 100),
  ].join('::');

  return createHash('sha256').update(content).digest('hex');
}
