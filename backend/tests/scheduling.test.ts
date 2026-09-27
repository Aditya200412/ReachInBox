import { describe, it, expect } from 'vitest';
import { calculateSchedules } from '../src/utils/scheduleCalculator.js';

describe('Scheduling Calculations', () => {
  it('should schedule times with 2s delay correctly', () => {
    const emails = ['a@example.com', 'b@example.com', 'c@example.com'];
    const startTime = new Date('2030-01-01T10:00:00Z');
    const delaySeconds = 2;

    const schedules = calculateSchedules(emails, startTime, delaySeconds);

    expect(schedules[0].scheduledAt.toISOString()).toBe('2030-01-01T10:00:00.000Z');
    expect(schedules[1].scheduledAt.toISOString()).toBe('2030-01-01T10:00:02.000Z');
    expect(schedules[2].scheduledAt.toISOString()).toBe('2030-01-01T10:00:04.000Z');
  });

  it('should handle 1000 emails correctly', () => {
    const emails = Array(1000).fill('test@example.com');
    const startTime = new Date('2030-01-01T10:00:00Z');
    const delaySeconds = 1;

    const schedules = calculateSchedules(emails, startTime, delaySeconds);

    expect(schedules).toHaveLength(1000);
    expect(schedules[0].scheduledAt.toISOString()).toBe('2030-01-01T10:00:00.000Z');
    expect(schedules[999].scheduledAt.toISOString()).toBe('2030-01-01T10:16:39.000Z'); // 999 seconds later
  });

  it('should default past startTime to now (approximately)', () => {
    const emails = ['a@example.com'];
    const pastTime = new Date('2000-01-01T10:00:00Z');
    const now = new Date();

    const schedules = calculateSchedules(emails, pastTime, 0);

    const diff = Math.abs(schedules[0].scheduledAt.getTime() - now.getTime());
    expect(diff).toBeLessThan(1000); // Should be very close to current time
  });

  it('should handle zero delay', () => {
    const emails = ['a@example.com', 'b@example.com'];
    const startTime = new Date('2030-01-01T10:00:00Z');

    const schedules = calculateSchedules(emails, startTime, 0);

    expect(schedules[0].scheduledAt.toISOString()).toBe('2030-01-01T10:00:00.000Z');
    expect(schedules[1].scheduledAt.toISOString()).toBe('2030-01-01T10:00:00.000Z');
  });
});
