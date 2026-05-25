const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'REDIS_URL',
];

export function validateEnv() {
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[ARKOS] Startup Error: Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`);
    throw new Error(
      `Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}`
    );
  }
}
