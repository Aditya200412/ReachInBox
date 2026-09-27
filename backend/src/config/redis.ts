import Redis from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let redisConnection: Redis | null = null;

export function getRedisConnection(): Redis {
  if (!redisConnection) {
    redisConnection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        logger.warn({ times, delay }, 'Redis connection retry');
        return delay;
      },
    });

    redisConnection.on('connect', () => {
      logger.info('Redis connected');
    });

    redisConnection.on('error', (err) => {
      logger.error({ err }, 'Redis connection error');
    });
  }

  return redisConnection;
}

/**
 * Create a new Redis connection for BullMQ workers/queues.
 * BullMQ requires separate connections for Queue and Worker.
 */
export function createRedisConnection(): Redis {
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      const delay = Math.min(times * 200, 5000);
      return delay;
    },
  });
}

export async function closeRedis(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    logger.info('Redis connection closed');
  }
}
