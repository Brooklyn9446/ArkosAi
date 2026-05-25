
export type VulnerablePackage = {
  name: string;
  version: string;
  vulnerabilities: {
    id: string;       // CVE ID like "CVE-2021-44228"
    summary: string;  // Human-readable description
    severity: string;
  }[];
  highestSeverity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  fixedVersion: string | null;
};

// Takes the entire dependencies object from package.json
// and returns only the packages that have known vulnerabilities
export async function checkDependencies(
  dependencies: Record<string, string>
): Promise<VulnerablePackage[]> {
  const vulnerablePackages: VulnerablePackage[] = [];
  const baseUrl = process.env.OSV_API_URL || 'https://api.osv.dev/v1';

  // Process all packages in parallel for speed.
  await Promise.all(
    Object.entries(dependencies).map(async ([name, versionRange]) => {
      // Strip semver range operators (^, ~, >=) to get a clean version.
      // OSV.dev needs "1.2.3" not "^1.2.3"
      const version = versionRange.replace(/[\^~>=<]/g, '').trim();

      // Skip workspace references and local file dependencies
      if (version.startsWith('workspace:') || version.startsWith('file:')) {
        return;
      }

      try {
        const response = await fetch(`${baseUrl}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version: version,
            package: {
              name: name,
              ecosystem: 'npm',
            },
          }),
        });

        if (!response.ok) return;

        const data = (await response.json()) as any;

        // OSV returns a "vulns" array. Empty array means no vulnerabilities.
        if (!data.vulns || data.vulns.length === 0) return;

        // Map OSV severity levels to our internal severity scale
        const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
          'CRITICAL': 'critical',
          'HIGH': 'high',
          'MODERATE': 'medium',
          'MEDIUM': 'medium',
          'LOW': 'low',
        };

        const vulns = data.vulns.map((v: any) => ({
          id: v.id,
          summary: v.summary ?? 'No description available',
          severity: v.database_specific?.severity ?? 'MEDIUM',
        }));

        // Determine the highest severity across all vulnerabilities
        // for this package, used to colour the finding card
        const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
        const mappedSeverities = vulns.map(
          (v: any) => severityMap[v.severity] ?? 'medium'
        );
        const highestSeverity = (severityOrder.find(
          s => mappedSeverities.includes(s)
        ) as 'critical' | 'high' | 'medium' | 'low' | 'info') ?? 'info';

        // Try to find the fixed version from the OSV affected ranges
        let fixedVersion: string | null = null;
        const firstVuln = data.vulns[0];
        if (firstVuln?.affected?.[0]?.ranges?.[0]?.events) {
          const fixedEvent = firstVuln.affected[0].ranges[0].events
            .find((e: any) => e.fixed);
          fixedVersion = fixedEvent?.fixed ?? null;
        }

        vulnerablePackages.push({
          name,
          version,
          vulnerabilities: vulns,
          highestSeverity,
          fixedVersion,
        });
      } catch (error) {
        // If OSV.dev is unreachable for a specific package, skip it
        // rather than failing the entire scan
        console.error(`OSV check failed for ${name}@${version}:`, error);
      }
    })
  );

  return vulnerablePackages;
}
