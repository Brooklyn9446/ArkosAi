import React from 'react';

interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles = {
    critical: 'bg-sev-critical/10 text-sev-critical',
    high: 'bg-sev-high/10 text-sev-high',
    medium: 'bg-sev-medium/10 text-sev-medium',
    low: 'bg-sev-low/10 text-sev-low',
    info: 'bg-sev-info/10 text-sev-info',
  };

  return (
    <span className={`inline-block font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-[4px] ${styles[severity] || 'bg-ink-dim/10 text-ink-sec'}`}>
      {severity}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'pending' | 'running' | 'complete' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStyleAndLabel = (s: typeof status) => {
    switch (s) {
      case 'pending':
        return { style: 'bg-ink-dim/20 text-ink-sec', label: 'PENDING' };
      case 'running':
        return { style: 'bg-copper-ghost text-copper', label: 'RUNNING' };
      case 'complete':
        return { style: 'bg-sev-low/10 text-sev-low', label: 'COMPLETE' };
      case 'failed':
        return { style: 'bg-sev-critical/10 text-sev-critical', label: 'FAILED' };
      default:
        return { style: 'bg-ink-dim/20 text-ink-sec', label: String(s).toUpperCase() };
    }
  };

  const { style, label } = getStyleAndLabel(status);

  return (
    <span className={`inline-block font-mono text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-[4px] ${style}`}>
      {label}
    </span>
  );
}
