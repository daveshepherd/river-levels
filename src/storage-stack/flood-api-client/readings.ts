import axios from 'axios';
import { logger } from '../powertools';
import { Reading } from '../reading';

const MEASURES_URL =
  'https://environment.data.gov.uk/flood-monitoring/id/measures';

interface FloodApiReadingsResponse {
  items: Array<{ dateTime: string; value: number }>;
}

/** Fetches a measure's readings, newest first, with the given query string. */
async function fetchReadings(
  measureId: string,
  query: string,
): Promise<Reading[]> {
  const url = `${MEASURES_URL}/${encodeURIComponent(measureId)}/readings?_sorted&${query}`;
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

/** A measure's latest `limit` readings, newest first. */
export async function getReadings(measureId: string, limit: number) {
  return fetchReadings(measureId, `_limit=${limit}`);
}

/** A measure's readings taken since `queryDate`, newest first. */
export async function getReadingsSince(measureId: string, queryDate: Date) {
  return fetchReadings(measureId, `since=${queryDate.toISOString()}`);
}
