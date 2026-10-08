import axios from 'axios';
import { logger } from '../powertools';
import { Reading } from '../reading';

// The Kenilworth river level gauge. See docs/infrastructure.md.
const READINGS_URL =
  'https://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings';

interface FloodApiReadingsResponse {
  items: Array<{ dateTime: string; value: number }>;
}

/** Fetches readings, newest first, with the given query string. */
async function fetchReadings(query: string): Promise<Reading[]> {
  const url = `${READINGS_URL}?_sorted&${query}`;
  logger.info('Requesting readings from the flood API', { url });
  let response;
  try {
    response = await axios.get<FloodApiReadingsResponse>(url);
  } catch (error) {
    logger.error('Error retrieving readings from the flood API', {
      url,
      error: error as Error,
    });
    throw error;
  }
  return response.data.items.map((reading) => ({
    date: new Date(reading.dateTime),
    depth: reading.value,
  }));
}

/** The latest `limit` readings, newest first. */
export async function getReadings(limit: number) {
  return fetchReadings(`_limit=${limit}`);
}

/** Readings taken since `queryDate`, newest first. */
export async function getReadingsSince(queryDate = new Date()) {
  return fetchReadings(`since=${queryDate.toISOString()}`);
}
