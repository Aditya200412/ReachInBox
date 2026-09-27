import { getElasticsearchClient } from '../config/elasticsearch.js';
import { EmailDocument } from '../integrations/elasticsearch/indexManager.js';
import { logger } from '../utils/logger.js';

export interface SearchResult {
  emails: EmailDocument[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Search emails in Elasticsearch.
 * Always filters by userId for security — user A cannot search user B's emails.
 */
export async function searchEmails(
  userId: string,
  query: string,
  filters?: { status?: string },
  page: number = 1,
  limit: number = 20
): Promise<SearchResult> {
  try {
    const client = getElasticsearchClient();
    const from = (page - 1) * limit;

    const must: any[] = [{ term: { userId } }];

    if (query && query.trim() !== '') {
      must.push({
        multi_match: {
          query,
          fields: ['recipientEmail^2', 'subject', 'body'],
        },
      });
    }

    if (filters?.status) {
      must.push({ term: { status: filters.status } });
    }

    const result = await client.search({
      index: 'emails',
      from,
      size: limit,
      body: {
        query: {
          bool: { must },
        },
        sort: [{ scheduledAt: { order: 'desc' } }],
      },
    });

    const hits = result.hits.hits;
    const totalValue =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : result.hits.total?.value || 0;

    const emails = hits.map((hit) => hit._source as EmailDocument);

    return { emails, total: totalValue, page, limit };
  } catch (error) {
    logger.error({ error, userId }, 'Elasticsearch search failed — returning empty results');
    return { emails: [], total: 0, page, limit };
  }
}
