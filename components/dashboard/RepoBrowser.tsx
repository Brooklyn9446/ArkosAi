'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, Lock, Unlock, Webhook, Terminal, 
  Loader2, CheckCircle2, AlertTriangle, RefreshCw 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { connectGitHub } from '@/lib/github/auth';
import { Github } from '@/components/ui/GithubIcon';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  updated_at: string;
}

interface MonitoredRepo {
  id: string;
  repo_full_name: string;
  repo_url: string;
  github_webhook_id: number;
}

interface RepoBrowserProps {
  onScanTriggered: (repoUrl: string) => void;
}

export default function RepoBrowser({ onScanTriggered }: RepoBrowserProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [monitored, setMonitored] = useState<MonitoredRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [webhookLoading, setWebhookLoading] = useState<Record<string, boolean>>({});

  // Manual URL scanning fallback
  const [manualUrl, setManualUrl] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuthAndFetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileErr) {
          console.warn('[RepoBrowser] Fetch profile error:', profileErr);
        }

        if (profileData?.github_username) {
          setIsConnected(true);
          setProfile(profileData);
          await Promise.all([fetchRepos(), fetchMonitored()]);
        }
      } catch (err) {
        console.error('[RepoBrowser] Error initializing:', err);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndFetch();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repositories || []);
        setError(null);
      } else {
        const data = await res.json();
        // If 400 is returned, user might need to re-authenticate
        if (res.status === 400) {
          setIsConnected(false);
        } else {
          setError(data.error || 'Failed to fetch repositories from GitHub.');
        }
      }
    } catch (err) {
      console.error('[RepoBrowser] Error fetching repos:', err);
      setError('Failed to fetch repositories from GitHub.');
    }
  };

  const fetchMonitored = async () => {
    try {
      const res = await fetch('/api/github/webhooks');
      if (res.ok) {
        const data = await res.json();
        setMonitored(data.monitored || []);
      }
    } catch (err) {
      console.error('[RepoBrowser] Error fetching monitored:', err);
    }
  };

  const handleConnect = async () => {
    try {
      await connectGitHub();
    } catch (err: any) {
      console.error('[RepoBrowser] GitHub Auth initiation failed:', err);
      setError('Could not connect to GitHub. Please try again.');
    }
  };

  const handleWebhookToggle = async (repo: Repository) => {
    const isCurrentlyMonitored = monitored.find(m => m.repo_full_name === repo.full_name);
    setWebhookLoading(prev => ({ ...prev, [repo.full_name]: true }));

    try {
      if (isCurrentlyMonitored) {
        // Deregister webhook
        const res = await fetch(`/api/github/webhooks?id=${isCurrentlyMonitored.id}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setMonitored(prev => prev.filter(m => m.repo_full_name !== repo.full_name));
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to remove webhook.');
        }
      } else {
        // Register webhook
        const res = await fetch('/api/github/webhooks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoUrl: repo.html_url }),
        });
        if (res.ok) {
          const data = await res.json();
          setMonitored(prev => [...prev, data.monitored]);
        } else {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to configure webhook.');
        }
      }
    } catch (err: any) {
      console.error('[RepoBrowser] Webhook toggle failed:', err);
      alert(`Webhook Configuration Error: ${err.message}`);
    } finally {
      setWebhookLoading(prev => ({ ...prev, [repo.full_name]: false }));
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;
    onScanTriggered(manualUrl.trim());
    setManualUrl('');
  };

  const filteredRepos = repos.filter(repo =>
    repo.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="card p-8 bg-surface border border-border-base flex flex-col items-center justify-center space-y-4 py-16">
        <Loader2 className="h-6 w-6 text-copper animate-spin" />
        <p className="text-xs font-mono text-ink-sec tracking-widest uppercase">
          Loading Repositories...
        </p>
      </div>
    );
  }

  // Not Connected State
  if (!isConnected) {
    return (
      <div className="space-y-6">
        {/* Connection Promotion Banner */}
        <div className="card p-8 bg-surface border border-border-base space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Github className="h-40 w-40" />
          </div>
          
          <div className="border-b border-border-base pb-3">
            <h3 className="font-mono text-xs text-ink-sec tracking-widest uppercase flex items-center gap-2">
              <Github className="h-4 w-4 text-copper" />
              <span>Connect GitHub</span>
            </h3>
          </div>

          <div className="space-y-3">
            <h4 className="font-display text-xl text-ink font-semibold tracking-wide">
              Automated Push Scanning & Repo Import
            </h4>
            <p className="text-sm font-body text-ink-sec leading-relaxed max-w-2xl">
              Connect your GitHub account to view and import your public and private repositories. Enabling this allows you to trigger scans with one click and configure automatic push webhooks.
            </p>
          </div>

          <button
            onClick={handleConnect}
            className="py-3 px-6 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors inline-flex items-center gap-2"
          >
            <Github className="h-4 w-4" />
            <span>CONNECT GITHUB ACCOUNT</span>
          </button>
        </div>

        {/* Manual Fallback */}
        <div className="card p-8 bg-surface border border-border-base space-y-5">
          <div className="border-b border-border-base pb-3">
            <h3 className="font-mono text-xs text-ink-sec tracking-widest uppercase">
              Manual Scan Fallback
            </h3>
          </div>
          
          <p className="text-sm font-body text-ink-sec leading-relaxed">
            Alternatively, scan any public repository immediately by pasting its repository URL below:
          </p>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="manualUrl" className="block font-mono text-[10px] text-ink-dim uppercase tracking-wider">
                GitHub Public URL
              </label>
              <input
                id="manualUrl"
                type="text"
                placeholder="https://github.com/owner/repository"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="bg-raised border border-border-base rounded-[2px] px-4 py-3 text-ink text-sm placeholder:text-ink-dim focus:outline-none focus:border-copper transition-colors w-full font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={!manualUrl.trim()}
              className="py-3 px-5 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Terminal className="h-4 w-4" />
              <span>RUN QUICK ANALYSIS</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Connected State
  return (
    <div className="space-y-6">
      {/* Header and User profile info */}
      <div className="card p-6 bg-surface border border-border-base flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {profile?.github_avatar_url ? (
            <img 
              src={profile.github_avatar_url} 
              alt={profile.github_username || 'Avatar'} 
              className="w-10 h-10 rounded-[2px] border border-border-bright"
            />
          ) : (
            <div className="w-10 h-10 bg-raised border border-border-base rounded-[2px] flex items-center justify-center">
              <Github className="h-5 w-5 text-ink-sec" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-display font-medium text-ink text-base">
                Connected to GitHub
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-[2px] bg-copper-ghost text-copper uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-xs font-mono text-ink-sec">
              @{profile?.github_username || 'username'}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleConnect}
          className="px-3 py-1.5 rounded-[2px] border border-border-base bg-raised text-[10px] font-mono text-ink-sec hover:text-ink hover:bg-hover transition-colors flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" />
          <span>RECONNECT / REFRESH</span>
        </button>
      </div>

      {/* Repository List Workspace */}
      <div className="card p-6 bg-surface border border-border-base space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border-base">
          <div>
            <h3 className="font-mono text-xs text-ink tracking-widest uppercase">
              Select Repository
            </h3>
            <p className="text-xs text-ink-sec font-body mt-0.5">
              Choose a repository to trigger an on-demand scan or enable automatic webhook push-scans.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-ink-dim" />
            </span>
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-raised border border-border-base rounded-[2px] pl-9 pr-4 py-2 text-ink text-xs placeholder:text-ink-dim focus:outline-none focus:border-copper transition-colors w-full font-mono"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-sev-critical/10 border border-sev-critical/20 rounded-[2px] flex items-start space-x-3">
            <AlertTriangle className="h-4 w-4 text-sev-critical shrink-0 mt-0.5" />
            <p className="text-xs font-mono text-sev-critical">
              {error}
            </p>
          </div>
        )}

        {/* Repositories Grid/List */}
        {filteredRepos.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border-base text-ink-dim font-mono text-xs rounded-[2px]">
            {searchTerm ? 'NO MATCHING REPOSITORIES FOUND' : 'NO REPOSITORIES FOUND'}
          </div>
        ) : (
          <div className="divide-y divide-border-base max-h-[450px] overflow-y-auto pr-2">
            {filteredRepos.map((repo) => {
              const isMonitored = monitored.some(m => m.repo_full_name === repo.full_name);
              const isToggling = webhookLoading[repo.full_name] || false;

              return (
                <div 
                  key={repo.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group transition-colors hover:bg-hover/10 px-2 -mx-2"
                >
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-body font-medium text-ink text-sm truncate">
                        {repo.full_name}
                      </span>
                      {repo.private ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-sev-high/10 text-sev-high text-[9px] font-mono uppercase tracking-wider">
                          <Lock className="h-2.5 w-2.5" />
                          <span>Private</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-copper-ghost text-copper text-[9px] font-mono uppercase tracking-wider">
                          <Unlock className="h-2.5 w-2.5" />
                          <span>Public</span>
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-xs text-ink-sec font-body line-clamp-1">
                        {repo.description}
                      </p>
                    )}
                    <p className="text-[10px] text-ink-dim font-mono">
                      Default branch: {repo.default_branch}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    {/* Auto-scan Webhook Toggle */}
                    <button
                      onClick={() => handleWebhookToggle(repo)}
                      disabled={isToggling}
                      className={`px-3 py-1.5 rounded-[2px] border text-[10px] font-mono flex items-center gap-1.5 transition-all ${
                        isMonitored
                          ? 'bg-copper-ghost border-copper text-copper hover:bg-copper/10'
                          : 'bg-raised border-border-base text-ink-sec hover:text-ink hover:border-border-bright'
                      }`}
                      title={isMonitored ? "Deactivate automatic webhook scans" : "Activate automatic scan on git push"}
                    >
                      {isToggling ? (
                        <Loader2 className="h-3 w-3 animate-spin text-copper" />
                      ) : (
                        <Webhook className={`h-3 w-3 ${isMonitored ? 'text-copper' : 'text-ink-sec'}`} />
                      )}
                      <span>{isMonitored ? 'AUTO-SCAN: ON' : 'AUTO-SCAN: OFF'}</span>
                    </button>

                    {/* Scan Trigger Button */}
                    <button
                      onClick={() => onScanTriggered(repo.html_url)}
                      className="px-3 py-1.5 rounded-[2px] bg-copper text-void font-mono text-[10px] hover:bg-copper-dim transition-colors flex items-center gap-1"
                    >
                      <Terminal className="h-3 w-3" />
                      <span>SCAN NOW</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual input fallback at the bottom in case they want a repo not listed */}
      <div className="p-4 bg-surface border border-border-base rounded-[2px] flex items-center justify-between">
        <span className="text-xs text-ink-sec font-body">
          Need to scan a repository not listed?
        </span>
        <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Paste public GitHub URL..."
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="bg-raised border border-border-base rounded-[2px] px-3 py-1.5 text-ink text-xs placeholder:text-ink-dim focus:outline-none focus:border-copper transition-colors font-mono w-60"
          />
          <button
            type="submit"
            disabled={!manualUrl.trim()}
            className="px-3 py-1.5 bg-raised border border-border-bright rounded-[2px] font-mono text-[10px] text-copper hover:text-copper-dim transition-colors"
          >
            SCAN
          </button>
        </form>
      </div>
    </div>
  );
}
