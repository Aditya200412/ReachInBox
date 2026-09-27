import { parse } from 'csv-parse';
import { z } from 'zod';

const emailSchema = z.string().email();

export interface ParseRecipientsResponse {
  valid: string[];
  invalid: string[];
  duplicates: string[];
}

/**
 * Parse a CSV or text file to extract email addresses.
 * Validates, deduplicates (case-insensitive), and normalizes to lowercase.
 */
export async function parseRecipients(
  buffer: Buffer,
  mimetype: string = 'text/plain',
  filename: string = ''
): Promise<ParseRecipientsResponse> {
  const result: ParseRecipientsResponse = {
    valid: [],
    invalid: [],
    duplicates: [],
  };

  const seen = new Set<string>();
  const emails: string[] = [];
  const text = buffer.toString('utf-8');

  if (mimetype === 'text/csv' || filename.toLowerCase().endsWith('.csv')) {
    // CSV parsing
    try {
      const parser = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });

      for await (const record of parser) {
        let emailStr = '';
        // Auto-detect email column
        for (const key of Object.keys(record)) {
          if (key.toLowerCase().includes('email')) {
            emailStr = record[key];
            break;
          }
        }
        if (!emailStr) {
          // Fallback: find any value containing @
          const values = Object.values(record) as string[];
          emailStr = values.find((v) => v.includes('@')) || '';
        }
        if (emailStr) {
          emails.push(emailStr.trim());
        }
      }
    } catch {
      // If CSV parsing fails, split lines/tokens
      const tokens = text.split(/[\s,\r\n]+/).filter(Boolean);
      emails.push(...tokens);
    }
  } else {
    // Text file: split by whitespace, comma, or newlines to evaluate all tokens
    const tokens = text.split(/[\s,\r\n]+/).filter(Boolean);
    emails.push(...tokens);
  }

  // Validate, lowercase, and deduplicate
  for (const email of emails) {
    const parsed = emailSchema.safeParse(email);
    if (parsed.success) {
      const lowerEmail = parsed.data.toLowerCase();
      if (seen.has(lowerEmail)) {
        if (!result.duplicates.includes(lowerEmail)) {
          result.duplicates.push(lowerEmail);
        }
      } else {
        seen.add(lowerEmail);
        result.valid.push(lowerEmail);
      }
    } else {
      result.invalid.push(email);
    }
  }

  return result;
}
