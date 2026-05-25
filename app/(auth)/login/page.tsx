import LoginForm from '@/components/auth/LoginForm';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-void p-6 relative">
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        {/* Brand */}
        <Link href="/" className="font-display text-2xl font-medium tracking-widest text-ink hover:text-copper transition-colors">
          ARKOS
        </Link>

        <LoginForm />
      </div>
    </main>
  );
}
