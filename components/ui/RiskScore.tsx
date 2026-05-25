export function RiskScore({ score }: { score: number }) {
  const colour =
    score >= 80 ? 'text-sev-critical' :
    score >= 60 ? 'text-sev-high'     :
    score >= 30 ? 'text-sev-medium'   :
                  'text-sev-low';

  const label =
    score >= 80 ? 'Critical Risk'  :
    score >= 60 ? 'High Risk'      :
    score >= 30 ? 'Medium Risk'    :
                  'Low Risk';

  return (
    <div className="flex flex-col items-start gap-1">
      <span className={`font-display text-6xl font-light ${colour}`}>
        {score.toFixed(0)}
      </span>
      <span className="font-mono text-xs text-ink-dim uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}
