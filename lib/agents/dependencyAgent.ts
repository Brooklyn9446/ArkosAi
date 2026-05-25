import { GoogleGenAI } from '@google/genai';
import { Finding } from '../types/database';
import { checkDependencies } from '../osv/checkDependencies';

export async function runDependencyAgent(
  files: { path: string; content: string }[]
): Promise<Finding[]> {
  // Instantiated to match prompt design, though mapping is deterministic
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY || 'dummy-key';
  const ai = new GoogleGenAI({ apiKey });

  // Find package.json in the fetched files.
  // We only care about the root package.json, not nested ones
  // in subdirectories which might be test fixtures.
  const packageJsonFile = files.find(
    f => f.path === 'package.json' || f.path.endsWith('/package.json')
  );

  if (!packageJsonFile) {
    // Not a Node.js project — return empty findings rather than erroring.
    return [];
  }

  let packageJson: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  try {
    packageJson = JSON.parse(packageJsonFile.content);
  } catch {
    console.error('Failed to parse package.json');
    return [];
  }

  // Combine both dependencies and devDependencies.
  // Security vulnerabilities in devDependencies matter less in production
  // but are still worth reporting.
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  if (!allDeps || Object.keys(allDeps).length === 0) {
    return [];
  }

  // Check all dependencies against OSV.dev
  const vulnerablePackages = await checkDependencies(allDeps);

  if (vulnerablePackages.length === 0) {
    return [];
  }

  // Generate plain-English descriptions for each
  // vulnerable package found by OSV.dev
  const findings: Finding[] = vulnerablePackages.map((pkg, index) => ({
    id: `dep-${String(index + 1).padStart(3, '0')}`,
    title: `Vulnerable dependency: ${pkg.name}@${pkg.version}`,
    description: `${pkg.name} version ${pkg.version} has ${pkg.vulnerabilities.length} known vulnerabilit${pkg.vulnerabilities.length === 1 ? 'y' : 'ies'}. ${pkg.vulnerabilities[0]?.summary ?? ''}`,
    severity: pkg.highestSeverity,
    category: 'dependency' as const,
    file_path: 'package.json',
    line_number: null,
    code_snippet: `"${pkg.name}": "${pkg.version}"`,
    fix_suggestion: pkg.fixedVersion
      ? `Upgrade ${pkg.name} from ${pkg.version} to ${pkg.fixedVersion} or later.`
      : `Remove or replace ${pkg.name} — no fixed version is currently available.`,
  }));

  return findings;
}
