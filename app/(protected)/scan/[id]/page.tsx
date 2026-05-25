'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShieldAlert, 
  Key, 
  Database, 
  Lock, 
  Loader2, 
  FileCode, 
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Scan, DbFinding, ScanTrend } from '@/lib/types/database';
import { RiskScore } from '@/components/ui/RiskScore';
import { createClient } from '@/lib/supabase/client';
import Header from '@/components/ui/Header';
import FindingCard from '@/components/dashboard/FindingCard';

export default function ScanReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const supabase = createClient();

  const [scan, setScan] = useState<Scan | null>(null);
  const [findings, setFindings] = useState<DbFinding[]>([]);
  const [trend, setTrend] = useState<ScanTrend | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  useEffect(() => {
    const fetchUserAndScan = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUserEmail(user.email ?? null);

        const res = await fetch(`/api/scans/${id}`);
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to retrieve analysis details.');
        }

        const data = await res.json();
        setScan(data.scan);
        setFindings(data.findings || []);
        setTrend(data.trend || null);
        
        // Update document title for SEO
        if (data.scan) {
          document.title = `ARKOS — Report for ${data.scan.repo_name}`;
        }
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading the report.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUserAndScan();
    }
  }, [id, router, supabase.auth]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-void text-ink flex flex-col justify-center items-center gap-4">
        <Loader2 className="h-8 w-8 text-copper animate-spin" />
        <span className="font-mono text-xs text-ink-sec uppercase tracking-widest">
          Loading report...
        </span>
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="min-h-screen bg-void text-ink flex flex-col font-body">
        <Header userEmail={userEmail} />

        <main className="flex-grow max-w-3xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
          <div className="card border-sev-critical/20 p-8 space-y-4 bg-surface text-center">
            <div className="flex flex-col items-center justify-center gap-3 text-sev-critical">
              <XCircle className="h-12 w-12" />
              <h3 className="font-display text-3xl font-light">Analysis Error</h3>
            </div>
            <p className="text-sm text-ink-sec font-body leading-relaxed">
              {error || 'The requested analysis scan could not be found or access is restricted.'}
            </p>
            <div className="pt-4">
              <Link
                href="/dashboard"
                className="px-6 py-2.5 bg-surface hover:bg-hover border border-border-base text-xs font-mono text-ink hover:text-copper transition-colors rounded-[2px]"
              >
                [ RETURN TO DASHBOARD ]
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Filter lists helper
  const filteredFindings = findings.filter((f) => {
    if (activeFilter === 'all') return true;
    return f.category === activeFilter;
  });

  const categories = [
    { id: 'all', label: 'All', count: findings.length },
    { id: 'secret', label: 'Secrets', count: findings.filter(f => f.category === 'secret').length },
    { id: 'owasp', label: 'OWASP Top 10', count: findings.filter(f => f.category === 'owasp').length },
    { id: 'dependency', label: 'Dependencies', count: findings.filter(f => f.category === 'dependency').length },
    { id: 'auth', label: 'Auth Review', count: findings.filter(f => f.category === 'auth').length },
  ];

  const getCategoryIcon = (catId: string) => {
    switch (catId) {
      case 'secret': return Key;
      case 'owasp': return ShieldAlert;
      case 'dependency': return Database;
      case 'auth': return Lock;
      default: return FileCode;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).toUpperCase();
    } catch {
      return 'UNKNOWN DATE';
    }
  };

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  return (
    <div className="min-h-screen bg-void text-ink flex flex-col font-body">
      {/* Top Header */}
      <Header userEmail={userEmail} />

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            className="text-xs font-mono text-ink-sec hover:text-ink transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>[ DASHBOARD ]</span>
          </Link>
        </div>

        {/* Scan Header Info Card */}
        <div className="card p-8 bg-surface space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border-base">
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-copper uppercase tracking-widest block">
                Analysis Report
              </span>
              <h1 className="font-display font-light text-4xl text-ink tracking-tight">
                {scan.repo_name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-ink-dim uppercase">
                <span>Scan ID: {scan.id}</span>
                <span>|</span>
                <span>Created: {formatDate(scan.created_at)}</span>
              </div>
            </div>
            <div>
              <a 
                href={scan.repo_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-block px-4 py-2 border border-border-base text-xs font-mono text-ink hover:text-copper hover:border-border-bright transition-colors rounded-[2px]"
              >
                [ GITHUB REPOSITORY ]
              </a>
            </div>
          </div>

          {/* If the scan failed */}
          {scan.status === 'failed' ? (
            <div className="p-5 bg-sev-critical/10 border border-sev-critical/20 rounded-[2px] flex items-start gap-3">
              <XCircle className="h-5 w-5 text-sev-critical shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-mono text-xs font-semibold text-sev-critical uppercase tracking-wider">
                  Analysis Failed
                </h4>
                <p className="text-xs text-ink-sec leading-relaxed">
                  The agents encountered a critical failure when pulling or parsing files for this repository. Please confirm that the repository contains supported file formats and is public.
                </p>
              </div>
            </div>
          ) : (
            /* Risk Score & Metrics Grid */
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Risk Score */}
              <div className="md:col-span-4 flex items-center bg-void/50 border border-border-base p-6 rounded-[2px]">
                <RiskScore score={scan.risk_score ?? 0} />
              </div>

              {/* Severity Metrics Column */}
              <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Critical', count: scan.critical_count, colorClass: 'text-sev-critical' },
                  { label: 'High', count: scan.high_count, colorClass: 'text-sev-high' },
                  { label: 'Medium', count: scan.medium_count, colorClass: 'text-sev-medium' },
                  { label: 'Low', count: scan.low_count, colorClass: 'text-sev-low' },
                ].map((metric) => (
                  <div 
                    key={metric.label} 
                    className="bg-void/35 border border-border-base p-4 rounded-[2px] flex flex-col justify-between h-[100px] hover:border-border-bright transition-colors"
                  >
                    <span className="font-mono text-[10px] text-ink-dim uppercase tracking-wider">
                      {metric.label}
                    </span>
                    <span className={`font-display text-4xl font-light ${metric.colorClass}`}>
                      {metric.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Trend Banner */}
        {scan.status === 'complete' && scan.trend_narrative && (
          <div className={`card p-6 bg-surface border-l-4 ${
            scan.trend_direction === 'improving' ? 'border-l-copper' :
            scan.trend_direction === 'stable' ? 'border-l-sev-medium' :
            scan.trend_direction === 'worsening' ? 'border-l-sev-high' :
            'border-l-ink-dim'
          } space-y-4`}>
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-xs font-semibold text-ink uppercase tracking-wider">
                Trend Analysis: {scan.trend_direction?.replace('_', ' ')}
              </span>
              <p className="text-sm font-body text-ink-sec leading-relaxed">
                {scan.trend_narrative}
              </p>
            </div>
            {trend && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-[10px] text-sev-high px-2.5 py-0.5 rounded-[2px] bg-sev-high/10 border border-sev-high/20">
                  {trend.new_findings} NEW
                </span>
                <span className="font-mono text-[10px] text-sev-low px-2.5 py-0.5 rounded-[2px] bg-sev-low/10 border border-sev-low/20">
                  {trend.fixed_findings} FIXED
                </span>
                <span className="font-mono text-[10px] text-sev-medium px-2.5 py-0.5 rounded-[2px] bg-sev-medium/10 border border-sev-medium/20">
                  {trend.recurring_findings} RECURRING
                </span>
              </div>
            )}
          </div>
        )}

        {/* Section below is only displayed if scan is not failed */}
        {scan.status !== 'failed' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-border-base pb-3">
              {categories.map((cat) => {
                const isActive = activeFilter === cat.id;
                const Icon = getCategoryIcon(cat.id);

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveFilter(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-[2px] text-xs font-mono transition-all duration-200 ${
                      isActive
                        ? 'bg-copper-ghost border-copper text-copper font-medium'
                        : 'bg-surface border-border-base text-ink-sec hover:text-ink hover:border-border-bright'
                    }`}
                  >
                    {cat.id !== 'all' && <Icon className="h-3.5 w-3.5" />}
                    <span>{cat.label}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.25 rounded-full ${
                      isActive ? 'bg-copper/20 text-copper' : 'bg-void text-ink-dim'
                    }`}>
                      {cat.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="card p-12 text-center bg-surface border-border-base space-y-4">
                <div className="flex flex-col items-center justify-center gap-3 text-copper">
                  <CheckCircle className="h-10 w-10 text-copper" />
                  <h3 className="font-display text-2xl font-light text-ink">
                    No Findings
                  </h3>
                </div>
                <p className="text-xs font-mono text-ink-sec max-w-md mx-auto uppercase tracking-wider">
                  No issues found matching this filter criteria.
                </p>
                <p className="text-sm font-body text-ink-sec max-w-md mx-auto leading-relaxed">
                  The relevant security analysis agents completed their checks and found zero vulnerabilities or warnings in the repository codebase.
                </p>
              </div>
            ) : (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {filteredFindings.map((finding) => (
                  <FindingCard 
                    key={finding.id} 
                    finding={finding} 
                    onStatusUpdate={handleStatusUpdate}
                    isCompactDefault={false}
                  />
                ))}
              </motion.div>
            )}
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
