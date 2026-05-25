'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Terminal, ArrowLeft, XCircle, Code } from 'lucide-react';
import { Scan } from '@/lib/types/database';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ScanProgressView from './ScanProgressView';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import RepoBrowser from './RepoBrowser';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function Sparkline({ data }: { data: any[] }) {
  // Sort by scanned_at ascending
  const sortedData = [...data].sort((a, b) => new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime());
  const chartData = sortedData.map((d, i) => ({ index: i, value: Number(d.risk_score) }));
  const lastVal = chartData[chartData.length - 1]?.value ?? 0;
  const prevVal = chartData[chartData.length - 2]?.value ?? lastVal;
  const isWorsening = lastVal > prevVal;
  const strokeColor = isWorsening ? '#D4622A' : '#7EB8A4'; // sev-high vs copper

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={strokeColor}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface DashboardWorkspaceProps {
  userEmail: string;
}

export default function DashboardWorkspace({ userEmail }: DashboardWorkspaceProps) {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeScan, setActiveScan] = useState<Scan | null>(null);
  const [trendsMap, setTrendsMap] = useState<Record<string, any[]>>({});

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Onboarding redirect check
  useEffect(() => {
    if (!loadingHistory && scans.length === 0) {
      const onboardingComplete = localStorage.getItem('arkos_onboarding_complete');
      if (!onboardingComplete) {
        router.push('/onboarding');
      }
    }
  }, [loadingHistory, scans, router]);

  // Fetch scans list on mount
  const fetchScans = async () => {
    try {
      const res = await fetch('/api/scans');
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans || []);
      }
    } catch (err) {
      console.error('Failed to fetch scans history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  // Fetch trend data in bulk for all repositories
  useEffect(() => {
    if (scans.length === 0) return;

    const fetchAllTrends = async () => {
      try {
        const res = await fetch('/api/trends');
        if (res.ok) {
          const data = await res.json();
          const trendsList = data.trends || [];

          // Group the bulk trends by repository name
          const newTrends: Record<string, any[]> = {};
          trendsList.forEach((trend: any) => {
            const repo = trend.repo_name;
            if (!newTrends[repo]) {
              newTrends[repo] = [];
            }
            newTrends[repo].push(trend);
          });

          setTrendsMap(newTrends);
        }
      } catch (err) {
        console.error('Failed to fetch all trends:', err);
      }
    };

    fetchAllTrends();
  }, [scans]);

  // Trigger a scan for a given repository URL
  const triggerScan = async (targetUrl: string) => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: targetUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit scan request');
      }

      const newScan: Scan = data.scan;

      // Update history list and set as active scan to show progress view
      setScans(prev => [newScan, ...prev]);
      setActiveScan(newScan);
    } catch (err: any) {
      console.error('Submission error:', err);
      setSubmitError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanClick = (scan: Scan) => {
    if (scan.status === 'complete' || scan.status === 'failed') {
      router.push(`/scan/${scan.id}`);
    } else {
      setActiveScan(scan);
    }
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

      {/* Left Column: Work Area (Submission / Live Progress) */}
      <div className="lg:col-span-8 space-y-6">

        {/* Reset / Back Navigation Button */}
        {activeScan && (
          <div className="flex items-center">
            <button
              onClick={() => setActiveScan(null)}
              className="text-xs font-mono text-ink-sec hover:text-ink transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3 w-3" />
              <span>[ NEW ANALYSIS ]</span>
            </button>
          </div>
        )}

        {/* 1. Repository Browser Workspace */}
        {!activeScan && (
          <div className="space-y-6">
            {submitError && (
              <div className="p-3 bg-sev-critical/10 border border-sev-critical/20 text-sev-critical text-xs font-mono rounded-[2px]">
                ERROR: {submitError}
              </div>
            )}

            {submitting && (
              <div className="card p-8 bg-surface border border-border-base flex flex-col items-center justify-center space-y-4 py-12">
                <div className="h-6 w-6 border-2 border-copper border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono text-ink-sec tracking-widest uppercase">
                  QUEUING SECURITY ANALYSIS...
                </p>
              </div>
            )}

            {!submitting && (
              <ErrorBoundary>
                <RepoBrowser onScanTriggered={triggerScan} />
              </ErrorBoundary>
            )}
          </div>
        )}

        {/* 2. Live Scan Progress View */}
        {activeScan && (activeScan.status === 'pending' || activeScan.status === 'running') && (
          <ScanProgressView scanId={activeScan.id} repoName={activeScan.repo_name} />
        )}
      </div>

      {/* Right Column: Prior Analyses Sidebar */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="font-mono text-xs text-ink-sec tracking-widest uppercase">
          Prior Analyses
        </h3>

        {loadingHistory ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-surface border border-border-base rounded-[2px] animate-pulse" />
            ))}
          </div>
        ) : scans.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border-base text-ink-dim font-mono text-xs rounded-[2px]">
            NO PREVIOUS SCANS
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {scans.map((scan) => {
              const isActive = activeScan?.id === scan.id;

              return (
                <button
                  key={scan.id}
                  onClick={() => handleScanClick(scan)}
                  className={`w-full text-left p-4 rounded-[2px] border transition-all duration-150 block relative ${isActive
                      ? 'bg-raised border-copper'
                      : 'bg-surface border-border-base hover:border-border-bright'
                    }`}
                >
                  {/* Subtle top indicator glow for selected active scan */}
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-copper" />
                  )}

                  <div className="space-y-3">
                    <div className="font-body font-medium text-sm text-ink truncate flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-ink-sec shrink-0" />
                      <span className="truncate">{scan.repo_name}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-[9px] text-ink-sec w-full">
                        <span>{formatDate(scan.created_at)}</span>
                        {scan.risk_score !== null && scan.status === 'complete' && (
                          <>
                            <span className="text-ink-dim">|</span>
                            <span className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono uppercase tracking-wider ${scan.risk_score >= 80 ? 'bg-sev-critical/10 text-sev-critical' :
                                scan.risk_score >= 60 ? 'bg-sev-high/10 text-sev-high' :
                                  scan.risk_score >= 30 ? 'bg-sev-medium/10 text-sev-medium' :
                                    'bg-sev-low/10 text-sev-low'
                              }`}>
                              Risk: {Math.round(scan.risk_score)}
                            </span>
                          </>
                        )}
                        {trendsMap[scan.repo_name] && trendsMap[scan.repo_name].length > 1 && (
                          <div className="w-[80px] h-[24px] inline-block ml-2 overflow-hidden bg-void/10 border border-border-base/20 rounded-[2px]">
                            <Sparkline data={trendsMap[scan.repo_name]} />
                          </div>
                        )}
                      </div>
                      <StatusBadge status={scan.status} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
