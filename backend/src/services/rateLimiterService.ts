import { getRedisConnection } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Distributed hourly rate limiter using Redis Lua script.
 * Key: rate-limit:<senderId>:<YYYY-MM-DD-HH>
 */
export async function checkHourlyRateLimit(
  senderId: string,
  hourlyLimit: number
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const redis = getRedisConnection();
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hour = String(now.getUTCHours()).padStart(2, '0');
  const windowStr = `${year}-${month}-${day}-${hour}`;

  const key = `rate-limit:${senderId}:${windowStr}`;

  const luaScript = `
    local current = redis.call("INCR", KEYS[1])
    if current == 1 then
      redis.call("EXPIRE", KEYS[1], 3600)
    end
    if current > tonumber(ARGV[1]) then
      return 0
    end
    return 1
  `;

  try {
    const result = await redis.eval(luaScript, 1, key, hourlyLimit);
    if (result === 0) {
      const nextHour = new Date(
        Date.UTC(year, now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1, 0, 0, 0)
      );
      const retryAfterMs = nextHour.getTime() - now.getTime();
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true };
  } catch (error) {
    logger.error({ error, senderId }, 'Redis rate limit check failed, failing open');
    return { allowed: true };
  }
}

/**
 * Distributed send throttle using Redis Lua script.
 * Enforces minimum delay between sends for a given sender.
 * Key: send-throttle:<senderId>
 */
export async function checkSendThrottle(
  senderId: string,
  delayMs: number
): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const redis = getRedisConnection();
  const key = `send-throttle:${senderId}`;
  const now = Date.now();

  const luaScript = `
    local lastSend = redis.call("GET", KEYS[1])
    local now = tonumber(ARGV[1])
    local delay = tonumber(ARGV[2])

    if lastSend then
      local timePassed = now - tonumber(lastSend)
      if timePassed < delay then
        return delay - timePassed
      end
    end

    redis.call("SET", KEYS[1], now, "PX", delay)
    return 0
  `;

  try {
    const result = await redis.eval(luaScript, 1, key, now, delayMs);
    const retryAfterMs = result as number;
    if (retryAfterMs > 0) {
      return { allowed: false, retryAfterMs };
    }
    return { allowed: true };
  } catch (error) {
    logger.error({ error, senderId }, 'Redis throttle check failed, failing open');
    return { allowed: true };
  }
}

/**
 * Rate limit notification deduplication.
 * Checks if a notification has already been sent for this sender/hour window.
 */
export async function isRateLimitNotified(
  senderId: string,
  hourWindow: string
): Promise<boolean> {
  const redis = getRedisConnection();
  const key = `slack-notified:${senderId}:${hourWindow}`;

  try {
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    logger.error({ error, senderId }, 'Redis notification dedup check failed');
    return false;
  }
}

/**
 * Mark that a notification was successfully sent for this sender/hour window.
 * Sets key with 1-hour expiration.
 */
export async function markRateLimitNotified(
  senderId: string,
  hourWindow: string
): Promise<void> {
  const redis = getRedisConnection();
  const key = `slack-notified:${senderId}:${hourWindow}`;

  try {
    await redis.set(key, '1', 'EX', 3600);
  } catch (error) {
    logger.error({ error, senderId }, 'Redis mark notification failed');
  }
}

/**
 * Legacy function for backward compatibility.
 */
export async function shouldNotifyRateLimit(
  senderId: string,
  hourWindow: string
): Promise<boolean> {
  const redis = getRedisConnection();
  const key = `slack-notified:${senderId}:${hourWindow}`;

  try {
    const result = await redis.set(key, '1', 'EX', 3600, 'NX');
    return result === 'OK';
  } catch (error) {
    logger.error({ error, senderId }, 'Redis notification dedup check failed');
    return false;
  }
}

