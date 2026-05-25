'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { SeverityBadge } from '../ui/Badge';
import { Scan, Finding } from '@/lib/types/database';

interface ScanReportProps {
  scan: Scan;
}

export default function ScanReport({ scan }: ScanReportProps) {
  const findings: Finding[] = scan.findings || [];

  const getRiskScoreColor = (score: number) => {
    if (score < 30) return 'text-sev-low';
    if (score < 60) return 'text-sev-medium';
    if (score < 80) return 'text-sev-high';
    return 'text-sev-critical';
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).toUpperCase();
    } catch {
      return 'UNKNOWN DATE';
    }
  };

  return (
    <div className="space-y-8 font-body">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border-base pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-display font-medium text-ink tracking-tight">
            {scan.repo_name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 font-mono text-xs text-ink-sec">
            <span>SCAN ID: {scan.id}</span>
            <span className="text-ink-dim">|</span>
            <span>COMPLETED: {scan.completed_at ? formatDate(scan.completed_at) : 'N/A'}</span>
            <span className="text-ink-dim">|</span>
            <span>FINDINGS: {findings.length} TOTAL</span>
          </div>
        </div>

        {scan.risk_score !== null && (
          <div className="flex items-center gap-4 bg-surface px-6 py-4 border border-border-base rounded-[2px] min-w-[180px] justify-between">
            <span className="font-mono text-xs text-ink-sec tracking-wider uppercase">Risk Score</span>
            <span className={`text-5xl font-display font-medium ${getRiskScoreColor(scan.risk_score)}`}>
              {Math.round(scan.risk_score)}
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Critical', count: scan.critical_count, color: 'text-sev-critical' },
          { label: 'High', count: scan.high_count, color: 'text-sev-high' },
          { label: 'Medium', count: scan.medium_count, color: 'text-sev-medium' },
          { label: 'Low', count: scan.low_count, color: 'text-sev-low' },
        ].map((sev) => (
          <div
            key={sev.label}
            className="arkos-card arkos-card-lit p-4 flex flex-col justify-between min-h-[100px]"
          >
            <span className="font-mono text-xs text-ink-sec tracking-wider uppercase">{sev.label}</span>
            <span className={`text-4xl font-mono ${sev.color} mt-2`}>
              {sev.count}
            </span>
          </div>
        ))}
      </div>

      {/* Findings Section */}
      <div className="space-y-4">
        <h3 className="font-mono text-xs text-ink-sec tracking-wider uppercase">Detailed Findings</h3>
        
        {findings.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border-base rounded-[2px] font-mono text-sm text-ink-sec">
            No issues detected in this scan.
          </div>
        ) : (
          <div className="space-y-4">
            {findings.map((finding, idx) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05, ease: 'easeOut' }}
                className="bg-surface border border-border-base rounded-[2px] p-5 space-y-4 relative"
              >
                {/* Severity badge & title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-base/40 pb-3">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={finding.severity} />
                    <h4 className="font-body font-medium text-ink text-base">
                      {finding.title}
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] text-ink-dim uppercase">
                    ID: {finding.id}
                  </span>
                </div>

                {/* File path */}
                <div className="font-mono text-xs text-copper">
                  {finding.file_path}
                  {finding.line_number ? ` : Line ${finding.line_number}` : ''}
                </div>

                {/* Description */}
                <p className="text-sm font-body text-ink-sec leading-relaxed">
                  {finding.description}
                </p>

                {/* Code Snippet */}
                {finding.code_snippet && (
                  <div className="space-y-1.5">
                    <span className="block font-mono text-[10px] text-ink-dim uppercase">Code Context</span>
                    <pre className="p-3 bg-void border border-border-base/60 text-xs font-mono text-ink overflow-x-auto rounded-[2px]">
                      <code>{finding.code_snippet}</code>
                    </pre>
                  </div>
                )}

                {/* Fix Suggestion */}
                {finding.fix_suggestion && (
                  <div className="p-3 bg-raised border border-border-base/60 rounded-[2px] space-y-1">
                    <span className="font-mono text-[10px] text-copper uppercase tracking-wider font-semibold">
                      Fix Recommendation
                    </span>
                    <p className="text-xs font-body text-ink-sec leading-relaxed">
                      {finding.fix_suggestion}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
