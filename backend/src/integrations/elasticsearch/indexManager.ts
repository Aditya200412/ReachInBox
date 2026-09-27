import { getElasticsearchClient } from '../../config/elasticsearch.js';
import { logger } from '../../utils/logger.js';

export interface EmailDocument {
  emailId: string;
  campaignId: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date;
  sentAt?: Date | null;
  createdAt: Date;
}

/**
 * Create the 'emails' Elasticsearch index with proper mappings.
 * Idempotent — skips if index already exists.
 */
export async function ensureEmailIndex(): Promise<void> {
  try {
    const client = getElasticsearchClient();
    const indexName = 'emails';
    const indexExists = await client.indices.exists({ index: indexName });

    if (!indexExists) {
      await client.indices.create({
        index: indexName,
        body: {
          mappings: {
            properties: {
              emailId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              userId: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 },
                },
              },
              subject: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword', ignore_above: 256 },
                },
              },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info('Elasticsearch "emails" index created');
    } else {
      logger.info('Elasticsearch "emails" index already exists');
    }
  } catch (error) {
    logger.error({ error }, 'Failed to ensure Elasticsearch index — ES features may be limited');
  }
}

/**
 * Index an email document into Elasticsearch.
 * Best-effort — failures are logged but don't throw.
 */
export async function indexEmail(email: EmailDocument): Promise<void> {
  try {
    const client = getElasticsearchClient();
    await client.index({
      index: 'emails',
      id: email.emailId,
      body: email,
    });
  } catch (error) {
    logger.warn({ error, emailId: email.emailId }, 'Failed to index email in Elasticsearch');
  }
}
