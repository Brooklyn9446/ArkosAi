'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, UserPlus } from 'lucide-react';

export default function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(errMsg || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 bg-surface border border-border-base rounded-[2px] relative overflow-hidden">
      {/* Lit top line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-copper/40 to-transparent" />

      <div className="flex flex-col items-center mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-[2px] bg-copper-ghost text-copper border border-copper-border mb-4">
          <UserPlus className="h-5 w-5" />
        </div>
        <h2 className="text-3xl font-display font-medium tracking-tight text-ink text-center">Create account</h2>
        <p className="text-sm font-body text-ink-sec mt-1 text-center">Get started with ARKOS security analysis</p>
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-xs font-body font-semibold uppercase tracking-wider text-ink-sec">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-sec">
              <Mail className="h-4 w-4" />
            </div>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="block w-full pl-10 pr-4 py-2.5 bg-raised border border-border-base rounded-[2px] text-ink placeholder-ink-dim focus:outline-none focus:border-copper transition duration-150 ease-in-out text-sm font-body"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-body font-semibold uppercase tracking-wider text-ink-sec">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-sec">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-10 pr-10 py-2.5 bg-raised border border-border-base rounded-[2px] text-ink placeholder-ink-dim focus:outline-none focus:border-copper transition duration-150 ease-in-out text-sm font-body"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-sec hover:text-ink focus:outline-none"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="text-xs font-body font-semibold uppercase tracking-wider text-ink-sec">
            Confirm Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-sec">
              <Lock className="h-4 w-4" />
            </div>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="block w-full pl-10 pr-10 py-2.5 bg-raised border border-border-base rounded-[2px] text-ink placeholder-ink-dim focus:outline-none focus:border-copper transition duration-150 ease-in-out text-sm font-body"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-[2px] bg-sev-critical/10 border border-sev-critical/20 text-sev-critical text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-body">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[2px] text-sm font-body font-medium text-void bg-copper hover:bg-copper-dim focus:outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-void border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              Sign Up
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm font-body text-ink-sec">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-copper hover:text-copper-dim transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
