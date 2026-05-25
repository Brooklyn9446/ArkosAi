import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DashboardWorkspace from '@/components/dashboard/DashboardWorkspace';
import Header from '@/components/ui/Header';

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-void text-ink flex flex-col font-body">
      {/* Top Header */}
      <Header userEmail={user.email} />

      {/* Main Content Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-6 py-8">
        <DashboardWorkspace />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-base bg-void py-6 text-center text-[10px] font-mono text-ink-dim">
        <p>&copy; {new Date().getFullYear()} ARKOS SECURITY ANALYSIS DASHBOARD &bull; SECURE CONTEXT</p>
      </footer>
    </div>
  );
}

