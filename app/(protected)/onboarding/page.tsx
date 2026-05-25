'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Terminal, Shield, ArrowRight, ArrowLeft,
  CheckCircle2, ArrowRightCircle, Sparkles, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { connectGitHub } from '@/lib/github/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Github } from '@/components/ui/GithubIcon';

interface UserProfile {
  id: string;
  github_username: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkGitHub() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (data?.github_username) {
          setIsConnected(true);
          setProfile(data);
          setStep(2);
        }
      } catch (err) {
        console.error('[Onboarding] Profile check error:', err);
      } finally {
        setLoading(false);
      }
    }

    checkGitHub();
  }, [router]);

  const handleConnect = async () => {
    try {
      await connectGitHub();
    } catch (err) {
      console.error('[Onboarding] OAuth error:', err);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('arkos_onboarding_complete', 'true');
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-copper animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-void text-ink font-body flex flex-col justify-between py-12 px-6">

      {/* Top Header */}
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5 text-copper" />
          <span className="font-mono text-sm tracking-wider font-semibold">ARKOS // ONBOARDING</span>
        </div>
        <div className="font-mono text-xs text-ink-sec">
          STEP {step} OF 3
        </div>
      </div>

      {/* Main Wizard Card */}
      <div className="max-w-2xl mx-auto w-full my-auto py-8">
        <div className="card p-8 sm:p-12 bg-surface border border-border-base rounded-[2px] relative overflow-hidden">

          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-copper/5 rounded-full blur-3xl pointer-events-none" />

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-copper font-mono text-xs uppercase tracking-widest">[ PHASE 3 INITIALIZATION ]</div>
                  <h1 className="font-display text-3xl sm:text-4xl text-ink font-bold tracking-tight leading-tight">
                    Welcome to the Intelligence Era
                  </h1>
                  <p className="text-sm sm:text-base font-body text-ink-sec leading-relaxed">
                    ARKOS goes beyond basic static scanning. It choreographs four specialized AI agents to analyze credentials, dependency updates, OWASP structures, and custom authentication flows concurrently.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-raised border border-border-base rounded-[2px] space-y-2">
                    <Shield className="h-5 w-5 text-copper" />
                    <h3 className="font-mono text-xs text-ink uppercase tracking-wide">Parallel Auditing</h3>
                    <p className="text-xs text-ink-sec leading-relaxed">
                      Secrets, OWASP, Dependency, and Auth agents run simultaneously to verify vulnerabilities.
                    </p>
                  </div>
                  <div className="p-4 bg-raised border border-border-base rounded-[2px] space-y-2">
                    <Sparkles className="h-5 w-5 text-copper" />
                    <h3 className="font-mono text-xs text-ink uppercase tracking-wide">Trend & Fix Intelligence</h3>
                    <p className="text-xs text-ink-sec leading-relaxed">
                      Track security metrics across your code commits and request automated patches.
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-base flex justify-end">
                  <button
                    onClick={() => setStep(2)}
                    className="py-3 px-6 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors inline-flex items-center gap-2"
                  >
                    <span>CONTINUE TO AUTHORIZATION</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-copper font-mono text-xs uppercase tracking-widest">[ INTEGRATION CONFIGURATION ]</div>
                  <h1 className="font-display text-3xl sm:text-4xl text-ink font-bold tracking-tight leading-tight">
                    Connect GitHub Workspace
                  </h1>
                  <p className="text-sm sm:text-base font-body text-ink-sec leading-relaxed">
                    Import your repositories directly and enable webhooks. This lets Arkos verify push commits on default branches automatically and alert you of new findings.
                  </p>
                </div>

                {isConnected ? (
                  <div className="p-5 bg-copper-ghost border border-copper/30 rounded-[2px] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-copper" />
                      <div>
                        <div className="text-sm font-mono text-ink font-semibold">GitHub Linked Successfully</div>
                        <div className="text-xs font-mono text-ink-sec">@{profile?.github_username}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono bg-copper text-void px-2 py-0.5 rounded-[2px]">CONNECTED</span>
                  </div>
                ) : (
                  <div className="p-6 bg-raised border border-border-base rounded-[2px] flex flex-col items-center justify-center text-center space-y-4 py-8">
                    <Github className="h-10 w-10 text-ink-sec" />
                    <div className="space-y-1">
                      <h4 className="font-mono text-xs text-ink uppercase tracking-wider">GitHub OAuth Access</h4>
                      <p className="text-xs text-ink-sec max-w-sm">
                        Secure repository importing and push webhook registration.
                      </p>
                    </div>
                    <button
                      onClick={handleConnect}
                      className="py-3 px-6 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors inline-flex items-center gap-2"
                    >
                      <Github className="h-4 w-4" />
                      <span>AUTHORIZE GITHUB ACCESS</span>
                    </button>
                  </div>
                )}

                <div className="pt-6 border-t border-border-base flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-mono text-ink-sec hover:text-ink transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>BACK</span>
                  </button>
                  <div className="flex items-center space-x-4">
                    {!isConnected && (
                      <button
                        onClick={() => setStep(3)}
                        className="text-xs font-mono text-ink-dim hover:text-ink-sec transition-colors"
                      >
                        SKIP INTEGRATION
                      </button>
                    )}
                    <button
                      onClick={() => setStep(3)}
                      className="py-3 px-6 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors inline-flex items-center gap-2"
                    >
                      <span>NEXT: INITIAL SCAN</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="space-y-3">
                  <div className="text-copper font-mono text-xs uppercase tracking-widest">[ DEPLOYMENT READY ]</div>
                  <h1 className="font-display text-3xl sm:text-4xl text-ink font-bold tracking-tight leading-tight">
                    Ready to Launch
                  </h1>
                  <p className="text-sm sm:text-base font-body text-ink-sec leading-relaxed">
                    You&apos;re ready to start secure code deployments. You can now import your repositories, set up automatic git-push webhooks, and trigger on-demand security scans directly from your dashboard.
                  </p>
                </div>

                <div className="p-5 bg-raised border border-border-bright/20 rounded-[2px] space-y-3 font-mono text-xs">
                  <div className="text-[10px] text-ink-dim uppercase">Active Integration Modules:</div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-sec">AI Agent Orchestrator</span>
                    <span className="text-copper">[ ACTIVE ]</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-sec">OAuth Import Interface</span>
                    <span className={isConnected ? "text-copper" : "text-ink-sec"}>
                      {isConnected ? "[ LINKED ]" : "[ BYPASSED ]"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-ink-sec">Push Auto-Scan Listeners</span>
                    <span className={isConnected ? "text-copper" : "text-ink-dim"}>
                      {isConnected ? "[ READY ]" : "[ INACTIVE ]"}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-border-base flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs font-mono text-ink-sec hover:text-ink transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>BACK</span>
                  </button>
                  <button
                    onClick={handleComplete}
                    className="py-3 px-6 rounded-[2px] text-xs font-mono text-void bg-copper hover:bg-copper-dim transition-colors inline-flex items-center gap-2"
                  >
                    <span>ENTER DASHBOARD</span>
                    <ArrowRightCircle className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer / Branding */}
      <div className="max-w-2xl mx-auto w-full text-center text-[10px] font-mono text-ink-dim uppercase tracking-widest">
        ARKOS SECURITY DEPLOYMENT PORTAL // v1.0.0
      </div>

    </div>
  );
}
