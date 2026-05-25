'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Terminal, Shield, ArrowRight } from 'lucide-react';

const TERMINAL_LINES = [
  { text: 'arkos@scanner:~$ ./arkos scan gitlab-org/gitaly', delay: 1000 },
  { text: 'Initializing parallel security agents...', delay: 600 },
  { text: '[+] SECRETS: Audit spawned (PID 4821)', delay: 400 },
  { text: '[+] OWASP: Header audit spawned (PID 4822)', delay: 300 },
  { text: '[+] DEPENDENCY: OSV.dev sync spawned (PID 4823)', delay: 350 },
  { text: '[+] AUTH: Auth module check spawned (PID 4824)', delay: 200 },
  { text: 'Fetching files recursively...', delay: 800 },
  { text: 'Found 47 files matching scannable extensions.', delay: 400 },
  { text: 'Scanning: src/auth/jwt.rs ... OK', delay: 300 },
  { text: 'Scanning: Cargo.toml ... WARNING', delay: 400 },
  { text: '  - Cargo.toml: vulnerability CVE-2023-45853 in dependency serde_json', delay: 100 },
  { text: 'Scanning: src/lib.rs ... OK', delay: 200 },
  { text: 'Deduplicating findings via SHA-256 fingerprinting...', delay: 600 },
  { text: '[SUCCESS] Audit completed in 3.42s', delay: 500 },
  { text: '  - Critical: 0 | High: 1 | Medium: 2 | Low: 3', delay: 200 },
  { text: '  - Generating trend analytics...', delay: 400 },
  { text: 'arkos@scanner:~$ ', delay: 2000 }
];

function TypewriterTerminal() {
  const [lines, setLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (currentIndex < TERMINAL_LINES.length) {
      const currentLine = TERMINAL_LINES[currentIndex];
      timeout = setTimeout(() => {
        setLines(prev => [...prev, currentLine.text]);
        setCurrentIndex(prev => prev + 1);
      }, currentLine.delay);
    } else {
      timeout = setTimeout(() => {
        setLines([]);
        setCurrentIndex(0);
      }, 3000);
    }

    return () => clearTimeout(timeout);
  }, [currentIndex]);

  return (
    <div className="w-full bg-surface border border-border-bright rounded-[2px] shadow-2xl overflow-hidden text-left flex flex-col h-[320px]">
      <div className="bg-raised border-b border-border-base px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 border border-sev-critical/50 bg-sev-critical/10 rounded-[1px]" />
          <div className="w-2.5 h-2.5 border border-sev-medium/50 bg-sev-medium/10 rounded-[1px]" />
          <div className="w-2.5 h-2.5 border border-sev-low/50 bg-sev-low/10 rounded-[1px]" />
        </div>
        <span className="font-mono text-[10px] text-ink-sec uppercase tracking-widest">
          ARKOS_CLI // SECURITY_SCANNER
        </span>
        <div className="w-6" />
      </div>

      <div className="p-5 font-mono text-[11px] text-ink-sec overflow-y-auto flex-1 space-y-1.5 scrollbar-thin scrollbar-thumb-raised">
        {lines.map((line, idx) => {
          const isCommand = line.startsWith('arkos@scanner:');
          const isWarning = line.includes('WARNING') || line.includes('vulnerability');
          const isSuccess = line.includes('[SUCCESS]');

          let textColor = 'text-ink-sec';
          if (isCommand) textColor = 'text-copper';
          else if (isWarning) textColor = 'text-sev-high';
          else if (isSuccess) textColor = 'text-sev-low';

          return (
            <div key={idx} className={`${textColor} leading-normal`}>
              {line}
            </div>
          );
        })}
        {currentIndex < TERMINAL_LINES.length && (
          <div className="inline-block w-1.5 h-3.5 bg-copper animate-pulse ml-0.5" />
        )}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-void text-ink flex flex-col selection:bg-copper selection:text-void">

      <header className="border-b border-border-base bg-void/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="h-5 w-5 text-copper" />
            <span className="font-mono text-sm tracking-wider font-bold">ARKOS</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="font-mono text-xs text-ink-sec hover:text-ink transition-colors">
              SIGN IN
            </Link>
            <Link href="/signup" className="py-2 px-4 border border-copper bg-copper-ghost font-mono text-xs text-copper hover:bg-copper hover:text-void rounded-[2px] transition-all">
              GET STARTED
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 sm:py-32 flex-1 flex items-center">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-copper/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 items-center relative z-10 w-full">
          <div className="space-y-6 text-left">
            <div className="inline-flex items-center space-x-2 bg-copper-ghost border border-copper-border px-3 py-1 rounded-[2px]">
              <Shield className="h-3.5 w-3.5 text-copper" />
              <span className="font-mono text-[10px] text-copper uppercase tracking-widest">
                INTELLIGENT REPOSITORY ANALYSIS
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-ink font-bold tracking-tight leading-[1.1]">
              Continuous static analysis, driven by parallel AI agents.
            </h1>

            <p className="text-sm sm:text-base font-body text-ink-sec leading-relaxed max-w-xl">
              ARKOS orchestrates parallel security AI agents that dynamically analyze codebase structures, secrets exposure, package dependencies, and custom authentication paths to generate production-ready fixes.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link
                id="hero-cta-signup"
                href="/signup"
                className="py-3 px-6 bg-copper text-void font-mono text-xs hover:bg-copper-dim rounded-[2px] transition-colors inline-flex items-center justify-center gap-2 text-center"
              >
                <span>INITIALIZE FREE ACCOUNT</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                id="hero-cta-login"
                href="/login"
                className="py-3 px-6 bg-surface border border-border-base font-mono text-xs text-ink hover:bg-hover transition-colors text-center rounded-[2px]"
              >
                SIGN IN TO DASHBOARD
              </Link>
            </div>
          </div>

          <div className="w-full">
            <TypewriterTerminal />
          </div>
        </div>
      </section>

      <section className="py-20 bg-surface border-y border-border-base">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-[10px] text-copper uppercase tracking-widest">
              SYSTEM ARCHITECTURE
            </span>
            <h2 className="font-display text-3xl text-ink font-semibold tracking-wide">
              How Arkos Secures Your Codebase
            </h2>
            <p className="text-sm text-ink-sec leading-relaxed font-body">
              A comprehensive three-step workflow designed to intercept vulnerabilities before they hit production environments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-raised border border-border-bright/20 rounded-[2px] space-y-4">
              <div className="w-8 h-8 bg-copper-ghost border border-copper-border flex items-center justify-center font-mono text-xs text-copper rounded-[2px]">
                01
              </div>
              <h3 className="font-display text-lg text-ink font-medium">Connect & Listen</h3>
              <p className="text-xs text-ink-sec leading-relaxed font-body">
                Connect your account via GitHub OAuth. Choose target repositories to install real-time push event webhooks, letting Arkos scan your default branch automatically on every push.
              </p>
            </div>

            <div className="p-6 bg-raised border border-border-bright/20 rounded-[2px] space-y-4">
              <div className="w-8 h-8 bg-copper-ghost border border-copper-border flex items-center justify-center font-mono text-xs text-copper rounded-[2px]">
                02
              </div>
              <h3 className="font-display text-lg text-ink font-medium">Parallel AI Audits</h3>
              <p className="text-xs text-ink-sec leading-relaxed font-body">
                Four concurrent security agents (Secrets, OWASP, Dependencies, Auth) analyze your codebase. Findings are consolidated and deduplicated using SHA-256 fingerprints.
              </p>
            </div>

            <div className="p-6 bg-raised border border-border-bright/20 rounded-[2px] space-y-4">
              <div className="w-8 h-8 bg-copper-ghost border border-copper-border flex items-center justify-center font-mono text-xs text-copper rounded-[2px]">
                03
              </div>
              <h3 className="font-display text-lg text-ink font-medium">Lazy Fix Generation</h3>
              <p className="text-xs text-ink-sec leading-relaxed font-body">
                Review findings with interactive code diffs and request one-click AI patches. If critical leaks are found, receive instant alerts via Resend notifications.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="font-mono text-[10px] text-copper uppercase tracking-widest">
              DETECTION SURFACE
            </span>
            <h2 className="font-display text-3xl text-ink font-semibold tracking-wide">
              Four Core Security Vectors
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-surface border border-border-base rounded-[2px] space-y-3">
              <div className="text-sev-critical font-mono text-xs tracking-wider font-semibold">01 // SECRETS</div>
              <h4 className="font-display text-base text-ink font-medium">Credential Leaks</h4>
              <p className="text-xs text-ink-sec font-body leading-relaxed">
                Scans for environment files, hardcoded JWT tokens, SSH keys, database credentials, and cloud API parameters.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border-base rounded-[2px] space-y-3">
              <div className="text-sev-high font-mono text-xs tracking-wider font-semibold">02 // OWASP</div>
              <h4 className="font-display text-base text-ink font-medium">Injection & Configurations</h4>
              <p className="text-xs text-ink-sec font-body leading-relaxed">
                Audits CORS configs, SQL injection patterns, missing security headers, XSS, and weak TLS rules.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border-base rounded-[2px] space-y-3">
              <div className="text-sev-medium font-mono text-xs tracking-wider font-semibold">03 // DEPENDENCIES</div>
              <h4 className="font-display text-base text-ink font-medium">OSV.dev Vulnerabilities</h4>
              <p className="text-xs text-ink-sec font-body leading-relaxed">
                Resolves version lockfiles and queries the Google OSV database to surface active CVE vulnerabilities.
              </p>
            </div>

            <div className="p-6 bg-surface border border-border-base rounded-[2px] space-y-3">
              <div className="text-sev-info font-mono text-xs tracking-wider font-semibold">04 // AUTHENTICATION</div>
              <h4 className="font-display text-base text-ink font-medium">Identity & Permissions</h4>
              <p className="text-xs text-ink-sec font-body leading-relaxed">
                Checks for unauthenticated routes, insecure endpoint permissions, and improper cookie session security.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border-base py-12 bg-void">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2">
            <Terminal className="h-4 w-4 text-copper" />
            <span className="font-mono text-xs tracking-wider text-ink-sec font-semibold">
              ARKOS // SECURING DEVELOPMENT PIPELINES
            </span>
          </div>
          <span className="font-mono text-[10px] text-ink-dim uppercase">
            © {new Date().getFullYear()} ARKOS INC. ALL RIGHTS RESERVED.
          </span>
        </div>
      </footer>

    </div>
  );
}
