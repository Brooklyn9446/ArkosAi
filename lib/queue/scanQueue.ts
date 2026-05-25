import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let redisConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      lazyConnect: true, // Prevent startup crash if Redis is offline
    });
    
    redisConnection.on('error', (err) => {
      console.error('[Redis] Connection error:', err);
    });
  }
  return redisConnection;
}

// Ensure the Queue is a singleton in development to prevent duplicate instances
declare global {
  // eslint-disable-next-line no-var
  var globalScanQueue: Queue | undefined;
}

export function getScanQueue(): Queue {
  if (typeof window === 'undefined') {
    if (!globalThis.globalScanQueue) {
      const connection = getRedisConnection();
      globalThis.globalScanQueue = new Queue('scanQueue', {
        connection,
        defaultJobOptions: {
          attempts: 2,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      });
    }
    return globalThis.globalScanQueue;
  }
  throw new Error('getScanQueue must only be called on the server side.');
}
