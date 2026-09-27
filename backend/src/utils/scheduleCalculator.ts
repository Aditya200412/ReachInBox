export interface ScheduledItem {
  email: string;
  scheduledAt: Date;
}

/**
 * Calculate scheduled send times for a list of recipient emails.
 * @param emails Array of recipient email addresses
 * @param startTime Base start time (if in the past, defaults to current time)
 * @param delayMs Delay between consecutive emails in milliseconds (or seconds if < 500)
 */
export function calculateSchedules(
  emails: string[],
  startTime?: Date,
  delayMs: number = 0
): ScheduledItem[] {
  const now = new Date();
  // If startTime is missing or in the past, clamp to current time
  const baseTime = startTime && startTime.getTime() >= now.getTime() ? new Date(startTime) : now;

  // Scale seconds to ms if passed as seconds (< 500)
  const stepMs = delayMs < 500 && delayMs > 0 ? delayMs * 1000 : delayMs;

  return emails.map((email, index) => {
    const scheduledAt = new Date(baseTime.getTime() + index * stepMs);
    return {
      email,
      scheduledAt,
    };
  });
}
