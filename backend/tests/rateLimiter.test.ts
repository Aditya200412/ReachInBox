import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkHourlyRateLimit, checkSendThrottle } from '../src/services/rateLimiterService.js';

const mockRedis = {
  eval: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock('../src/config/redis.js', () => ({
  getRedisConnection: () => mockRedis,
}));

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow sending when under hourly limit', async () => {
    mockRedis.eval.mockResolvedValue(1); // 1 = allowed
    const result = await checkHourlyRateLimit('sender-1', 10);
    expect(result.allowed).toBe(true);
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it('should block sending when hourly limit is exceeded', async () => {
    mockRedis.eval.mockResolvedValue(0); // 0 = limit reached
    const result = await checkHourlyRateLimit('sender-1', 10);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it('should allow sending when throttle delay has passed', async () => {
    mockRedis.eval.mockResolvedValue(0); // 0 = allowed (0 wait time)
    const result = await checkSendThrottle('sender-1', 2000);
    expect(result.allowed).toBe(true);
  });

  it('should return retryAfterMs when send throttle is active', async () => {
    mockRedis.eval.mockResolvedValue(1500); // 1500ms remaining wait
    const result = await checkSendThrottle('sender-1', 2000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBe(1500);
  });
});
