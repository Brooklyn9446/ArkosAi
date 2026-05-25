type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const styles: Record<Severity, string> = {
  critical: 'bg-sev-critical/10 text-sev-critical',
  high:     'bg-sev-high/10    text-sev-high',
  medium:   'bg-sev-medium/10  text-sev-medium',
  low:      'bg-sev-low/10     text-sev-low',
  info:     'bg-sev-info/10    text-sev-info',
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`
      inline-block font-mono text-[10px] uppercase tracking-widest
      px-2 py-0.5 rounded-full
      ${styles[severity]}
    `}>
      {severity}
    </span>
  );
}
