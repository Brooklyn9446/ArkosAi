import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let scanRateLimit: Ratelimit | null = null;
let apiRateLimit: Ratelimit | null = null;

if (url && token) {
  try {
    const redis = new Redis({
      url,
      token,
    });

    // Allow each user to run 10 scans per day.
    scanRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 d'),
      analytics: true,
    });

    // Allow 100 API requests per minute for general endpoints.
    apiRateLimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
    });
    console.log('[ARKOS] Upstash Rate Limiting initialized successfully.');
  } catch (err) {
    console.error('[ARKOS] Failed to initialize Upstash Rate Limiter:', err);
  }
} else {
  console.warn('[ARKOS] Rate limiting disabled (missing UPSTASH_REDIS_REST_URL/TOKEN). Bypassing checks.');
}

export async function checkScanLimit(userId: string) {
  if (!scanRateLimit) {
    return { success: true, limit: 10, remaining: 10, reset: Date.now() + 86400000 };
  }
  return await scanRateLimit.limit(`scan_${userId}`);
}

export async function checkApiLimit(key: string) {
  if (!apiRateLimit) {
    return { success: true, limit: 100, remaining: 100, reset: Date.now() + 60000 };
  }
  return await apiRateLimit.limit(`api_${key}`);
}
