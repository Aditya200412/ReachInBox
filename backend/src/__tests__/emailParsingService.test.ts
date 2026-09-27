import { describe, it, expect } from 'vitest';
import { parseRecipients } from '../services/emailParsingService.js';

describe('emailParsingService', () => {
  it('parses valid emails from text content', async () => {
    const textContent = `
      user1@example.com
      user2@example.com
      INVALID_EMAIL
      user1@example.com
    `;
    const buffer = Buffer.from(textContent, 'utf-8');
    const result = await parseRecipients(buffer, 'text/plain', 'recipients.txt');

    expect(result.valid).toEqual(['user1@example.com', 'user2@example.com']);
    expect(result.invalid).toEqual(['INVALID_EMAIL']);
    expect(result.duplicates).toEqual(['user1@example.com']);
  });

  it('parses CSV with header column email', async () => {
    const csvContent = `name,email\nAlice,alice@example.com\nBob,bob@example.com\nCharlie,invalid-email`;
    const buffer = Buffer.from(csvContent, 'utf-8');
    const result = await parseRecipients(buffer, 'text/csv', 'recipients.csv');

    expect(result.valid).toEqual(['alice@example.com', 'bob@example.com']);
    expect(result.invalid).toEqual(['invalid-email']);
    expect(result.duplicates).toEqual([]);
  });

  it('handles empty input gracefully', async () => {
    const buffer = Buffer.from('', 'utf-8');
    const result = await parseRecipients(buffer, 'text/plain', 'empty.txt');

    expect(result.valid).toEqual([]);
    expect(result.invalid).toEqual([]);
    expect(result.duplicates).toEqual([]);
  });
});
