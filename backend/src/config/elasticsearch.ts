import { Client } from '@elastic/elasticsearch';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let esClient: Client | null = null;

export function getElasticsearchClient(): Client {
  if (!esClient) {
    esClient = new Client({
      node: config.ELASTICSEARCH_URL,
      requestTimeout: 10000,
      maxRetries: 3,
    });
  }
  return esClient;
}

export async function checkElasticsearchHealth(): Promise<boolean> {
  try {
    const client = getElasticsearchClient();
    const health = await client.cluster.health();
    logger.info({ status: health.status }, 'Elasticsearch cluster health');
    return health.status !== 'red';
  } catch (err) {
    logger.warn({ err }, 'Elasticsearch health check failed — ES features will be unavailable');
    return false;
  }
}

export async function closeElasticsearch(): Promise<void> {
  if (esClient) {
    await esClient.close();
    esClient = null;
    logger.info('Elasticsearch connection closed');
  }
}
