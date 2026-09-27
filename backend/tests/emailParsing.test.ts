import { describe, it, expect } from 'vitest';
import { parseRecipients } from '../src/services/emailParsingService.js';

describe('Email Parsing Service', () => {
  it('should parse CSV with email column only', async () => {
    const csvContent = Buffer.from('email\ntest1@example.com\ntest2@example.com');
    const result = await parseRecipients(csvContent, 'text/csv');
    expect(result.valid).toHaveLength(2);
    expect(result.valid).toEqual(['test1@example.com', 'test2@example.com']);
  });

  it('should parse CSV with name,email columns', async () => {
    const csvContent = Buffer.from('name,email\nAlice,alice@example.com\nBob,bob@example.com');
    const result = await parseRecipients(csvContent, 'text/csv');
    expect(result.valid).toHaveLength(2);
    expect(result.valid).toEqual(['alice@example.com', 'bob@example.com']);
  });

  it('should parse text file with inline emails', async () => {
    const textContent = Buffer.from('Here is an email: a@example.com\nAnother one: b@example.com, and c@example.com');
    const result = await parseRecipients(textContent, 'text/plain');
    expect(result.valid).toHaveLength(3);
    expect(result.valid).toEqual(expect.arrayContaining(['a@example.com', 'b@example.com', 'c@example.com']));
  });

  it('should remove duplicate emails case-insensitively', async () => {
    const textContent = Buffer.from('test@example.com\nTEST@example.com\nother@example.com');
    const result = await parseRecipients(textContent, 'text/plain');
    expect(result.valid).toHaveLength(2);
    expect(result.valid).toEqual(['test@example.com', 'other@example.com']);
    expect(result.duplicates).toEqual(['test@example.com']);
  });

  it('should reject invalid emails', async () => {
    const textContent = Buffer.from('valid@example.com\ninvalid-email\n@missingdomain.com\nmissing@.com');
    const result = await parseRecipients(textContent, 'text/plain');
    expect(result.valid).toHaveLength(1);
    expect(result.valid).toEqual(['valid@example.com']);
    expect(result.invalid).toEqual(['invalid-email', '@missingdomain.com', 'missing@.com']);
  });

  it('should handle empty file', async () => {
    const emptyContent = Buffer.from('');
    const result = await parseRecipients(emptyContent, 'text/plain');
    expect(result.valid).toHaveLength(0);
  });

  it('should handle mixed valid and invalid in CSV', async () => {
    const csvContent = Buffer.from('email\nvalid1@example.com\nbademail\nvalid2@example.com');
    const result = await parseRecipients(csvContent, 'text/csv');
    expect(result.valid).toHaveLength(2);
    expect(result.valid).toEqual(['valid1@example.com', 'valid2@example.com']);
    expect(result.invalid).toEqual(['bademail']);
  });
});
