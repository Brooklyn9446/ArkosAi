type Status = 'pending' | 'running' | 'complete' | 'failed';

const styles: Record<Status, string> = {
  pending:  'bg-ink-dim/20  text-ink-sec',
  running:  'bg-copper-ghost text-copper',
  complete: 'bg-sev-low/10  text-sev-low',
  failed:   'bg-sev-critical/10 text-sev-critical',
};

const labels: Record<Status, string> = {
  pending:  'PENDING',
  running:  'RUNNING',
  complete: 'COMPLETE',
  failed:   'FAILED',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`
      inline-block font-mono text-[10px] uppercase tracking-widest
      px-2 py-0.5 rounded-full
      ${styles[status]}
    `}>
      {labels[status]}
    </span>
  );
}
