'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import SignOutButton from '../auth/SignOutButton';

interface HeaderProps {
  userEmail?: string | null;
}

export default function Header({ userEmail }: HeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border-base bg-void px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between w-full">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-[2px] bg-copper-ghost border border-copper-border flex items-center justify-center text-copper">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <span className="font-display font-light text-2xl tracking-[0.25em] text-ink uppercase">
              Arkos
            </span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`font-mono text-xs uppercase tracking-widest transition-all ${
                pathname === '/dashboard'
                  ? 'text-copper border-b border-copper pb-1'
                  : 'text-ink-sec hover:text-ink'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/findings"
              className={`font-mono text-xs uppercase tracking-widest transition-all ${
                pathname === '/findings'
                  ? 'text-copper border-b border-copper pb-1'
                  : 'text-ink-sec hover:text-ink'
              }`}
            >
              Findings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {userEmail && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-surface border border-border-base text-xs font-mono text-ink-sec">
              <span className="h-1.5 w-1.5 rounded-full bg-copper" />
              <span>{userEmail}</span>
            </div>
          )}
          <SignOutButton />
        </div>
      </div>
      {/* Mobile nav */}
      <div className="md:hidden flex justify-center gap-6 pt-3 mt-1 border-t border-border-base/50">
        <Link
          href="/dashboard"
          className={`font-mono text-xs uppercase tracking-widest transition-all ${
            pathname === '/dashboard'
              ? 'text-copper border-b border-copper pb-1'
              : 'text-ink-sec hover:text-ink'
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/findings"
          className={`font-mono text-xs uppercase tracking-widest transition-all ${
            pathname === '/findings'
              ? 'text-copper border-b border-copper pb-1'
              : 'text-ink-sec hover:text-ink'
          }`}
        >
          Findings
        </Link>
      </div>
    </header>
  );
}
