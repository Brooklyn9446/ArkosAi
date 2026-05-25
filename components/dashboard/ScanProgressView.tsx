'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, ShieldAlert, Database, Lock, Loader2, ArrowRight } from 'lucide-react';

interface ScanProgressViewProps {
  scanId: string;
  repoName: string;
}

export default function ScanProgressView({ scanId, repoName }: ScanProgressViewProps) {
  const router = useRouter();
  const [stage, setStage] = useState<string>('connecting');
  const [message, setMessage] = useState<string>('Establishing connection to agent stream...');
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let fallbackPollInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      eventSource = new EventSource(`/api/scans/${scanId}/progress`);

      eventSource.onopen = () => {
        setError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.stage) {
            setStage(data.stage);
          }
          if (data.message) {
            setMessage(data.message);
          }
          if (data.completedAgents) {
            setCompletedAgents(data.completedAgents);
          }

          if (data.stage === 'complete' || data.stage === 'failed') {
            eventSource?.close();
            // Automatically redirect to the scan report page
            setTimeout(() => {
              router.push(`/scan/${scanId}`);
            }, 1500);
          }
        } catch (err) {
          console.error('[SSE] Failed to parse progress event:', err);
        }
      };

      eventSource.onerror = (err) => {
        console.error('[SSE] Connection error:', err);
        // Do not immediately fail, let's fall back to polling if SSE fails
        eventSource?.close();
        startFallbackPolling();
      };
    };

    const startFallbackPolling = () => {
      console.log('[SSE] Falling back to database polling');
      setError('Real-time connection lost. Falling back to active status polling...');
      
      fallbackPollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/scans/${scanId}`);
          if (!res.ok) throw new Error('Failed to fetch scan progress');
          
          const data = await res.json();
          const scan = data.scan;

          if (scan) {
            if (scan.status === 'complete' || scan.status === 'failed') {
              setStage(scan.status);
              setMessage(scan.status === 'complete' ? 'Analysis complete.' : 'Analysis failed.');
              setCompletedAgents(['secrets', 'owasp', 'dependency', 'auth']);
              if (fallbackPollInterval) {
                clearInterval(fallbackPollInterval);
              }
              setTimeout(() => {
                router.push(`/scan/${scanId}`);
              }, 1500);
            } else {
              setStage('scanning');
              setMessage('Analyzing codebase files...');
            }
          }
        } catch (err) {
          console.error('[Polling] Failed to poll scan state:', err);
        }
      }, 3000);
    };

    connectSSE();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackPollInterval) {
        clearInterval(fallbackPollInterval);
      }
    };
  }, [scanId, router]);

  const agents = [
    {
      id: 'secrets',
      name: 'Secrets Scanner',
      icon: Key,
      description: 'Crawling codebase for exposed API keys, private tokens, and passwords.',
    },
    {
      id: 'owasp',
      name: 'OWASP Analysis',
      icon: ShieldAlert,
      description: 'Scanning code blocks for standard OWASP Top 10 vulnerabilities and injection flaws.',
    },
    {
      id: 'dependency',
      name: 'Dependencies',
      icon: Database,
      description: 'Consulting OSV.dev database for known vulnerabilities in manifest dependencies.',
    },
    {
      id: 'auth',
      name: 'Auth Review',
      icon: Lock,
      description: 'Analyzing authentication routes, middleware patterns, and token exchange handling.',
    },
  ];

  // Helper to determine agent status
  const getAgentStatus = (agentId: string) => {
    if (completedAgents.includes(agentId)) {
      return 'complete';
    }
    if (stage === 'scanning' || stage === 'complete') {
      return 'running';
    }
    return 'waiting';
  };

  return (
    <div className="card card-lit p-8 space-y-8 bg-surface">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-base pb-4">
        <div>
          <span className="font-mono text-[10px] text-copper uppercase tracking-widest block mb-1">
            Analysis in Progress
          </span>
          <h2 className="font-display text-3xl font-light text-ink tracking-tight">
            {repoName}
          </h2>
          <span className="font-mono text-[10px] text-ink-dim uppercase block mt-1">
            Scan ID: {scanId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stage !== 'complete' ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-copper-ghost border border-copper-border rounded-full text-copper font-mono text-[10px] uppercase tracking-widest">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>{stage}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-sev-low/10 border border-sev-low/20 rounded-full text-sev-low font-mono text-[10px] uppercase tracking-widest">
              <span>COMPLETE</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Console Output Message */}
      <div className="p-4 bg-void border border-border-base rounded-[2px] font-mono text-xs text-ink-sec space-y-2">
        <div className="flex items-center gap-2 text-copper">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-copper animate-pulse" />
          <span className="uppercase tracking-wider">Console Log</span>
        </div>
        <p className="leading-relaxed text-[11px] text-ink font-mono">{message}</p>
        {error && (
          <p className="text-sev-high text-[10px] font-mono mt-1">{error}</p>
        )}
      </div>

      {/* Agent 2x2 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((agent) => {
          const status = getAgentStatus(agent.id);
          const Icon = agent.icon;

          return (
            <div
              key={agent.id}
              className={`p-5 rounded-[2px] border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[160px] ${
                status === 'complete'
                  ? 'bg-void border-copper/30'
                  : status === 'running'
                  ? 'bg-void border-border-bright'
                  : 'bg-void/40 border-border-base opacity-60'
              }`}
            >
              {/* Card top gradient glow for active agents */}
              {status === 'running' && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-copper/50" />
              )}
              {status === 'complete' && (
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-copper" />
              )}

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-[2px] ${
                      status === 'complete'
                        ? 'bg-copper-ghost text-copper'
                        : status === 'running'
                        ? 'bg-copper-ghost/50 text-copper/70'
                        : 'bg-raised text-ink-dim'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="font-body font-medium text-sm text-ink">
                      {agent.name}
                    </h4>
                  </div>
                  <span className={`font-mono text-[9px] uppercase tracking-widest ${
                    status === 'complete'
                      ? 'text-copper'
                      : status === 'running'
                      ? 'text-copper-dim animate-pulse'
                      : 'text-ink-dim'
                  }`}>
                    {status === 'complete' ? '[ DONE ]' : status === 'running' ? '[ RUNNING ]' : '[ WAITING ]'}
                  </span>
                </div>

                <p className="text-xs font-body text-ink-sec leading-relaxed">
                  {agent.description}
                </p>
              </div>

              {/* Progress bar container */}
              <div className="mt-4 space-y-1.5">
                <div className="relative w-full h-[3px] bg-raised overflow-hidden rounded-full">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${
                      status === 'complete'
                        ? 'w-full bg-copper'
                        : status === 'running'
                        ? 'w-1/2 bg-copper/40 radar-sweep'
                        : 'w-0 bg-ink-dim/20'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {stage === 'complete' && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => router.push(`/scan/${scanId}`)}
            className="flex items-center gap-2 text-xs font-mono text-copper hover:text-ink transition-colors"
          >
            <span>VIEW DETAILED FINDINGS</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
