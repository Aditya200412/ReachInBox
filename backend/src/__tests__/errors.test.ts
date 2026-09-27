import { describe, it, expect } from 'vitest';
import {
  AppError,
  NotFoundError,
  ValidationError,
  AuthenticationError,
  RateLimitExceededError,
} from '../utils/errors.js';

describe('Custom Errors', () => {
  it('instantiates NotFoundError with correct status code and format', () => {
    const err = new NotFoundError('Campaign not found');
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.errorCode).toBe('NOT_FOUND');
    expect(err.message).toBe('Campaign not found');
  });

  it('instantiates ValidationError with correct status code and details', () => {
    const err = new ValidationError('Invalid inputs', { field: 'subject' });
    expect(err.statusCode).toBe(400);
    expect(err.errorCode).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'subject' });
  });

  it('instantiates RateLimitExceededError with retryAfterMs', () => {
    const err = new RateLimitExceededError('Rate limit exceeded', 15000);
    expect(err.statusCode).toBe(429);
    expect(err.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.retryAfterMs).toBe(15000);
  });
});
