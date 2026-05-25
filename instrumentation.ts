export async function register() {
  // Ensure this only runs on the Node.js server side, not in Edge runtime
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/config/validateEnv');
    try {
      validateEnv();
      console.log('[Instrumentation] Environment validation passed.');
    } catch (err: any) {
      console.error('[Instrumentation] Environment validation failed:', err.message);
      // In development, we can warn; in production we let it throw.
      if (process.env.NODE_ENV === 'production') {
        throw err;
      }
    }

    const { initWorker } = await import('./lib/queue/worker');
    try {
      initWorker();
      console.log('[Instrumentation] Background scan worker initialized successfully.');
    } catch (err) {
      console.error('[Instrumentation] Failed to initialize scan worker:', err);
    }
  }
}
