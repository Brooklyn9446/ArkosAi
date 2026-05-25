'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Key, 
  ShieldAlert, 
  Database, 
  Lock, 
  FileCode,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';
import { DbFinding } from '@/lib/types/database';
import { SeverityBadge } from '@/components/ui/SeverityBadge';

interface FindingCardProps {
  finding: DbFinding;
  onStatusUpdate: (findingId: string, status: string, note: string) => Promise<void>;
  isCompactDefault?: boolean;
}

export default function FindingCard({ 
  finding, 
  onStatusUpdate, 
  isCompactDefault = false 
}: FindingCardProps) {
  const [isExpanded, setIsExpanded] = useState(!isCompactDefault);
  const [isHovered, setIsHovered] = useState(false);
  const [triageNote, setTriageNote] = useState('');
  
  // Fix generation states
  const [generatingFix, setGeneratingFix] = useState(false);
  const [fixResult, setFixResult] = useState<{
    diff: string;
    explanation: string;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
    cached?: boolean;
  } | null>(null);
  
  // Cached local values for fields if we already generated a fix (e.g. from DB)
  useState(() => {
    if (finding.fix_diff) {
      setFixResult({
        diff: finding.fix_diff,
        explanation: finding.fix_explanation || '',
        confidence: (finding.fix_confidence || 'medium') as 'high' | 'medium' | 'low',
        warnings: []
      });
    }
  });

  const [copiedDiff, setCopiedDiff] = useState(false);
  const [copiedExplanation, setCopiedExplanation] = useState(false);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'secret': return Key;
      case 'owasp': return ShieldAlert;
      case 'dependency': return Database;
      case 'auth': return Lock;
      default: return FileCode;
    }
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'secret': return 'Secrets';
      case 'owasp': return 'OWASP Top 10';
      case 'dependency': return 'Dependency';
      case 'auth': return 'Auth Review';
      default: return 'Code Quality';
    }
  };

  const handleTriage = async (status: 'accepted' | 'false_positive') => {
    await onStatusUpdate(finding.id, status, triageNote);
    setTriageNote('');
  };

  const handleReopen = async () => {
    await onStatusUpdate(finding.id, 'open', '');
  };

  const handleGenerateFix = async () => {
    setGeneratingFix(true);
    try {
      const res = await fetch(`/api/findings/${finding.id}/fix`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setFixResult(data);
      } else {
        console.error("Failed to generate fix");
      }
    } catch (err) {
      console.error("Error generating fix:", err);
    } finally {
      setGeneratingFix(false);
    }
  };

  const handleCopyDiff = () => {
    if (!fixResult) return;
    navigator.clipboard.writeText(fixResult.diff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  const handleCopyExplanation = () => {
    if (!fixResult) return;
    navigator.clipboard.writeText(fixResult.explanation);
    setCopiedExplanation(true);
    setTimeout(() => setCopiedExplanation(false), 2000);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).toUpperCase();
    } catch {
      return 'UNKNOWN DATE';
    }
  };

  const CatIcon = getCategoryIcon(finding.category);
  const repoName = (finding as any).scans?.repo_name;
  const isTriaged = finding.status !== 'open';

  return (
    <div 
      className={`card bg-surface transition-all duration-200 ${
        isTriaged ? 'opacity-40' : ''
      }`}
    >
      {/* Top indicator bar on hover or expansion */}
      <div className={`h-[1.5px] w-full transition-colors ${
        isExpanded ? 'bg-copper' : 'bg-transparent'
      }`} />

      <div className="p-6 space-y-4">
        {/* Header Area */}
        <div 
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-base/50 pb-3 cursor-pointer"
          onClick={() => isCompactDefault && setIsExpanded(!isExpanded)}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <SeverityBadge severity={finding.severity} />
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-sec bg-void px-2 py-0.5 border border-border-base rounded-[2px] uppercase">
              <CatIcon className="h-3 w-3" />
              <span>{getCategoryLabel(finding.category)}</span>
            </div>
            {repoName && (
              <span className="font-mono text-xs text-copper font-medium tracking-tight">
                {repoName}
              </span>
            )}
            {isCompactDefault && (
              <span className="text-ink-dim hover:text-ink transition-colors ml-1">
                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </span>
            )}
          </div>

          <div className="font-mono text-[10px] text-ink-dim flex items-center gap-3">
            {finding.recurrence_count > 1 && (
              <span className="px-2 py-0.5 rounded-[2px] bg-sev-medium text-void font-mono text-xs font-semibold">
                Seen {finding.recurrence_count} times
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-ink-dim" />
              <span>{finding.file_path}{finding.line_number ? `:L${finding.line_number}` : ''}</span>
            </div>
          </div>
        </div>

        {/* Compact Title and Info always visible */}
        <div className="space-y-1">
          <h3 
            className="font-body font-semibold text-base text-ink cursor-pointer hover:text-copper transition-colors"
            onClick={() => isCompactDefault && setIsExpanded(!isExpanded)}
          >
            {finding.title}
          </h3>
          {isCompactDefault && !isExpanded && (
            <div className="flex items-center justify-between gap-2 pt-1 font-mono text-[9px] text-ink-dim uppercase">
              <span>First seen: {formatDate(finding.first_seen_at)}</span>
              {isTriaged && (
                <span className="px-1.5 py-0.25 rounded-[2px] bg-raised border border-border-base text-ink-sec text-[8px] font-mono">
                  {finding.status === 'accepted' ? 'ACCEPTED RISK' : 'FALSE POSITIVE'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expanded Content Panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden space-y-4"
            >
              {/* Finding Description */}
              <p className="text-xs font-body text-ink-sec leading-relaxed">
                {finding.description}
              </p>

              {/* Code Snippet */}
              {finding.code_snippet && (
                <div className="space-y-1.5">
                  <span className="block font-mono text-[9px] text-ink-dim uppercase tracking-wider">
                    Code context:
                  </span>
                  <pre className="font-mono text-[11px] bg-void border border-border-base p-3 overflow-x-auto text-ink-sec rounded-[2px] max-h-[160px]">
                    <code>{finding.code_snippet}</code>
                  </pre>
                </div>
              )}

              {/* Recommendation Box */}
              <div className="bg-copper-ghost border border-copper-border/40 p-4 rounded-[2px] space-y-1.5">
                <span className="block text-copper font-mono text-[9px] uppercase tracking-widest font-semibold">
                  Fix — Recommendation
                </span>
                <p className="text-xs font-body text-ink leading-relaxed">
                  {finding.fix_suggestion}
                </p>
              </div>

              {/* Status Triage Controls */}
              <div 
                className="flex flex-wrap items-center gap-4 pt-2 border-t border-border-base/50"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {!isTriaged ? (
                  <>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleTriage('accepted')}
                        className="px-2 py-1 border border-transparent hover:border-border-bright text-[10px] font-mono text-ink-sec hover:text-copper transition-colors rounded-[2px] uppercase"
                      >
                        [ Mark as accepted ]
                      </button>
                      <button
                        onClick={() => handleTriage('false_positive')}
                        className="px-2 py-1 border border-transparent hover:border-border-bright text-[10px] font-mono text-ink-sec hover:text-copper transition-colors rounded-[2px] uppercase"
                      >
                        [ Mark as false positive ]
                      </button>
                    </div>
                    {isHovered && (
                      <input
                        type="text"
                        placeholder="Optional triage note..."
                        value={triageNote}
                        onChange={(e) => setTriageNote(e.target.value)}
                        className="bg-raised border border-border-base rounded-[2px] px-3 py-1 text-[10px] text-ink placeholder:text-ink-dim focus:outline-none focus:border-copper transition-colors font-mono w-56"
                      />
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-[2px] font-mono text-[10px] uppercase tracking-wider ${
                        finding.status === 'accepted' 
                          ? 'bg-sev-medium/10 text-sev-medium border border-sev-medium/20' 
                          : 'bg-sev-high/10 text-sev-high border border-sev-high/20'
                      }`}>
                        Triaged: {finding.status === 'accepted' ? 'Accepted Risk' : 'False Positive'}
                      </span>
                      {finding.status_note && (
                        <span className="font-mono text-[10px] text-ink-dim">
                          Note: "{finding.status_note}"
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleReopen}
                      className="text-[9px] font-mono text-copper hover:underline uppercase"
                    >
                      [ Reopen Finding ]
                    </button>
                  </div>
                )}
              </div>

              {/* Lazy Fix Generator Section */}
              {!isTriaged && (
                <div className="pt-4 border-t border-border-base/50 space-y-4">
                  {!generatingFix && !fixResult && (
                    <button
                      onClick={handleGenerateFix}
                      className="px-4 py-2 border border-copper text-copper bg-transparent hover:bg-copper-ghost transition-all font-mono text-xs tracking-wider rounded-[2px] uppercase"
                    >
                      [ Generate Fix ]
                    </button>
                  )}

                  {generatingFix && (
                    <div className="space-y-2">
                      <div className="relative w-full h-[3px] bg-raised overflow-hidden rounded-full">
                        <div className="absolute left-0 top-0 h-full w-1/2 bg-copper/40 radar-sweep rounded-full" />
                      </div>
                      <span className="font-mono text-xs text-ink-dim block">
                        Generating fix...
                      </span>
                    </div>
                  )}

                  <AnimatePresence>
                    {fixResult && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border border-border-base bg-void/30 rounded-[2px]">
                          {/* Left: Diff Viewer */}
                          <div className="space-y-2">
                            <span className="font-mono text-[9px] text-ink-dim uppercase tracking-wider block">
                              Unified Patch Diff
                            </span>
                            <pre className="font-mono text-[11px] bg-void border border-border-base p-3 overflow-x-auto text-ink-sec rounded-[2px] max-h-[300px]">
                              <code>
                                {fixResult.diff ? (
                                  fixResult.diff.split('\n').map((line, idx) => {
                                    let bgClass = '';
                                    let textClass = 'text-ink-sec';
                                    if (line.startsWith('+')) {
                                      bgClass = 'bg-sev-low/10 px-1';
                                      textClass = 'text-sev-low';
                                    } else if (line.startsWith('-')) {
                                      bgClass = 'bg-sev-critical/10 px-1';
                                      textClass = 'text-sev-critical';
                                    } else if (line.startsWith('@@')) {
                                      textClass = 'text-sev-info';
                                    }
                                    return (
                                      <div key={idx} className={`${bgClass} ${textClass}`}>
                                        {line}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-ink-dim font-mono italic">No file context diff patch generated. Check suggestion below.</div>
                                )}
                              </code>
                            </pre>
                          </div>

                          {/* Right: Explanation & Warnings */}
                          <div className="space-y-4 flex flex-col justify-between">
                            <div className="space-y-3">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className="font-mono text-[9px] text-ink-dim uppercase tracking-wider block">
                                  Fix Analyst Explanation
                                </span>
                                
                                <span className={`px-2 py-0.5 rounded-[2px] text-[9px] font-mono uppercase tracking-wider ${
                                  fixResult.confidence === 'high' ? 'bg-sev-low/10 text-sev-low border border-sev-low/20' :
                                  fixResult.confidence === 'medium' ? 'bg-sev-medium/10 text-sev-medium border border-sev-medium/20' :
                                  'bg-sev-high/10 text-sev-high border border-sev-high/20'
                                }`}>
                                  Confidence: {fixResult.confidence}
                                </span>

                                {fixResult.cached && (
                                  <span className="font-mono text-[9px] text-ink-dim italic">
                                    [ CACHED ]
                                  </span>
                                )}
                              </div>
                              
                              <p className="text-xs font-body text-ink-sec leading-relaxed">
                                {fixResult.explanation}
                              </p>

                              {/* Warnings */}
                              {fixResult.warnings && fixResult.warnings.length > 0 && (
                                <div className="space-y-1.5 pt-2 border-t border-border-base/50">
                                  <span className="font-mono text-[9px] text-sev-medium uppercase tracking-wider block font-semibold">
                                    Caveats & Warnings:
                                  </span>
                                  <ul className="list-disc pl-4 text-[10px] font-mono text-sev-medium space-y-1">
                                    {fixResult.warnings.map((w, idx) => (
                                      <li key={idx}>{w}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {/* Copy Buttons */}
                            <div className="flex items-center gap-3 pt-2">
                              {fixResult.diff && (
                                <button
                                  onClick={handleCopyDiff}
                                  className="text-[10px] font-mono text-copper hover:text-copper-dim transition-colors uppercase border border-copper-border/40 hover:border-copper-border px-3 py-1.5 rounded-[2px]"
                                >
                                  {copiedDiff ? '[ COPIED ]' : '[ COPY DIFF ]'}
                                </button>
                              )}
                              <button
                                onClick={handleCopyExplanation}
                                className="text-[10px] font-mono text-copper hover:text-copper-dim transition-colors uppercase border border-copper-border/40 hover:border-copper-border px-3 py-1.5 rounded-[2px]"
                              >
                                {copiedExplanation ? '[ COPIED ]' : '[ COPY EXPLANATION ]'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
