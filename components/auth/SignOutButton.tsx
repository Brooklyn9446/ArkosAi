'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.refresh();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-copper hover:text-copper-dim transition-colors disabled:opacity-50"
    >
      {loading ? (
        <div className="h-3.5 w-3.5 border-2 border-copper border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          <LogOut className="h-3.5 w-3.5" />
          <span>[ SIGN OUT ]</span>
        </>
      )}
    </button>
  );
}

