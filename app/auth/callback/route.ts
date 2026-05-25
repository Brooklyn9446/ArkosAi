import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error && data.session) {
      // Store the GitHub token and username in the profiles table
      // so the worker can use it for authenticated API calls.
      const githubUsername = 
        data.session.user.user_metadata?.user_name || 
        data.session.user.user_metadata?.preferred_username || 
        null;
        
      const githubAvatarUrl = 
        data.session.user.user_metadata?.avatar_url || 
        null;

      const { error: upsertError } = await supabase.from('profiles').upsert({
        id: data.session.user.id,
        github_username: githubUsername,
        github_avatar_url: githubAvatarUrl,
        github_token: data.session.provider_token,
        updated_at: new Date().toISOString(),
      });

      if (upsertError) {
        console.error('[OAuth Callback] Profile upsert failed:', upsertError.message);
      }
    } else if (error) {
      console.error('[OAuth Callback] Exchange session error:', error.message);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
