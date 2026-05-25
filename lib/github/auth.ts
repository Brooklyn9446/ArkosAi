import { createClient } from '@/lib/supabase/client';

export async function connectGitHub() {
  const supabase = createClient();
  
  const redirectUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      // Request these specific scopes:
      // repo — access to public and private repos
      // read:user — access to user profile info
      scopes: 'repo read:user',
      redirectTo: redirectUrl,
    },
  });
  
  if (error) throw error;
}

export async function getGitHubToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // The provider token is the GitHub OAuth token.
  // It's available on the session object after OAuth login.
  return session?.provider_token ?? null;
}
