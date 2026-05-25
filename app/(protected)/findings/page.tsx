'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import FindingCard from '@/components/dashboard/FindingCard';
import { DbFinding } from '@/lib/types/database';

interface ExtendedFinding extends DbFinding {
  scans?: {
    repo_name: string;
  } | null;
}

const supabase = createClient();

export default function FindingsHistoryPage() {
  const router = useRouter();

  const [findings, setFindings] = useState<ExtendedFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('open');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchFindings() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email ?? null);

        // Build query parameters for server-side filtering
        const params = new URLSearchParams();
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (severityFilter !== 'all') params.append('severity', severityFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);

        const res = await fetch(`/api/findings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setFindings(data.findings || []);
        } else {
          console.error("Failed to fetch findings");
        }
      } catch (err) {
        console.error("Failed to load findings history page:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchFindings();
    document.title = 'ARKOS — Global Security Findings';
  }, [statusFilter, severityFilter, categoryFilter, router]);

  const handleStatusUpdate = async (findingId: string, status: string, note: string) => {
    try {
      const res = await fetch(`/api/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, status_note: note }),
      });
      if (res.ok) {
        const data = await res.json();
        setFindings(prev => prev.map(f => f.id === findingId ? data.finding : f));
      } else {
        console.error("Failed to update finding status");
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Stat calculations based on raw findings
  const openFindings = findings.filter(f => f.status === 'open');
  const openCount = openFindings.length;
  const uniqueRepos = Array.from(
    new Set(openFindings.map(f => f.scans?.repo_name).filter(Boolean))
  );

  console.log(uniqueRepos);

  const repoCount = uniqueRepos.length;

  // Filter findings client-side
  const filteredFindings = findings.filter((finding) => {
    // 1. Status Filter
    if (statusFilter !== 'all' && finding.status !== statusFilter) return false;

    // 2. Severity Filter
    if (severityFilter !== 'all' && finding.severity !== severityFilter) return false;

    // 3. Category Filter
    if (categoryFilter !== 'all' && finding.category !== categoryFilter) return false;

    // 4. Text Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const titleMatch = finding.title.toLowerCase().includes(query);
      const pathMatch = (finding.file_path || '').toLowerCase().includes(query);
      const repoMatch = (finding.scans?.repo_name || '').toLowerCase().includes(query);
      return titleMatch || pathMatch || repoMatch;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-ink flex flex-col justify-center items-center gap-4">
        <Loader2 className="h-8 w-8 text-copper animate-spin" />
        <span className="font-mono text-xs text-ink-sec uppercase tracking-widest">
          Loading findings explorer...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-ink flex flex-col font-body">
      {/* Navigation Header */}
      <Header userEmail={userEmail} />

      {/* Main Workspace Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 space-y-6">

        {/* Page Title & Stats */}
        <div className="space-y-2 pb-4 border-b border-border-base">
          <h1 className="font-display font-light text-4xl text-ink tracking-tight uppercase">
            Security Findings
          </h1>
          <p className="text-sm font-body text-ink-sec">
            {openCount} open issue{openCount !== 1 ? 's' : ''} detected across {repoCount} active repositor{repoCount !== 1 ? 'ies' : 'y'}.
          </p>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-surface border border-border-base p-5 rounded-[2px]">
          {/* Status Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block font-mono text-[9px] text-ink-dim uppercase tracking-wider">
              Triage Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-raised border border-border-base rounded-[2px] px-3 py-2 text-ink text-xs focus:outline-none focus:border-copper transition-colors w-full font-mono uppercase"
            >
              <option value="all">ALL STATUSES</option>
              <option value="open">OPEN ISSUES</option>
              <option value="accepted">ACCEPTED RISK</option>
              <option value="false_positive">FALSE POSITIVES</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block font-mono text-[9px] text-ink-dim uppercase tracking-wider">
              Severity
            </label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-raised border border-border-base rounded-[2px] px-3 py-2 text-ink text-xs focus:outline-none focus:border-copper transition-colors w-full font-mono uppercase"
            >
              <option value="all">ALL SEVERITIES</option>
              <option value="critical">CRITICAL</option>
              <option value="high">HIGH</option>
              <option value="medium">MEDIUM</option>
              <option value="low">LOW</option>
              <option value="info">INFO</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block font-mono text-[9px] text-ink-dim uppercase tracking-wider">
              Scan Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-raised border border-border-base rounded-[2px] px-3 py-2 text-ink text-xs focus:outline-none focus:border-copper transition-colors w-full font-mono uppercase"
            >
              <option value="all">ALL CATEGORIES</option>
              <option value="secret">SECRETS</option>
              <option value="owasp">OWASP AUDIT</option>
              <option value="dependency">DEPENDENCIES</option>
              <option value="auth">AUTH REVIEW</option>
            </select>
          </div>

          {/* Text Search Input */}
          <div className="md:col-span-3 space-y-1.5">
            <label className="block font-mono text-[9px] text-ink-dim uppercase tracking-wider">
              Search Text
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search title, file path..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-raised border border-border-base rounded-[2px] pl-8 pr-3 py-2 text-ink text-xs placeholder:text-ink-dim focus:outline-none focus:border-copper transition-colors w-full font-mono"
              />
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-dim" />
            </div>
          </div>
        </div>

        {/* Filtered Findings List */}
        {filteredFindings.length === 0 ? (
          <div className="card p-12 text-center bg-surface border-border-base space-y-4">
            <div className="flex flex-col items-center justify-center gap-3 text-copper">
              <ShieldAlert className="h-10 w-10 text-copper" />
              <h3 className="font-display text-2xl font-light text-ink">
                No Findings Found
              </h3>
            </div>
            <p className="text-xs font-mono text-ink-sec max-w-md mx-auto uppercase tracking-wider">
              Try adjusting your filter options above.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFindings.map((finding) => (
              <FindingCard
                key={finding.id}
                finding={finding}
                onStatusUpdate={handleStatusUpdate}
                isCompactDefault={true}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-border-base bg-void py-6 text-center text-[10px] font-mono text-ink-dim">
        <p>&copy; {new Date().getFullYear()} ARKOS SECURITY ANALYSIS DASHBOARD &bull; SECURE CONTEXT</p>
      </footer>
    </div>
  );
}
