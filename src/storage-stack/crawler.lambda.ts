import type { Context } from 'aws-lambda';
import * as floodApi from './flood-api-client/readings';
import { logger, traced } from './powertools';
import { Reading } from './reading';
import { parseStations, StationConfig } from './stations';
import * as readingStore from './store/readings';

/** How many readings to backfill when there's no recent stored reading: 24 hours of 15-minute readings. */
export const DEFAULT_READINGS_LIMIT = 96;

/** A stored reading older than this is too old to fetch everything since, so the crawler backfills instead. */
export const MAX_LOOKBACK_DAYS = 7;

/** The spike filter only applies when the stored reading is less than this far before the oldest new reading. */
export const SPIKE_FILTER_WINDOW_MS = 60 * 60 * 1000;

/** The default for StationConfig.maxDepthRiseMetres. */
export const DEFAULT_MAX_DEPTH_RISE_METRES = 2;

export interface CrawlerEvent {
  /** Overrides DEFAULT_READINGS_LIMIT for a backfill. */
  readingsLimit?: number;
}

/**
 * Drops readings that jump implausibly far above the latest stored reading.
 * Only applies when the new readings follow on from it with no gap, so a
 * genuine rise after a gap isn't discarded. `newReadings` is newest first.
 */
function dropSpikes(
  newReadings: Reading[],
  latest: Reading | null,
  maxDepthRiseMetres: number,
) {
  const oldestNewReading = newReadings.at(-1);
  if (
    !latest ||
    !oldestNewReading ||
    latest.date.getTime() <=
      oldestNewReading.date.getTime() - SPIKE_FILTER_WINDOW_MS
  ) {
    return newReadings;
  }
  const kept = newReadings.filter(
    (reading) => reading.depth < latest.depth + maxDepthRiseMetres,
  );
  if (kept.length < newReadings.length) {
    logger.warn(
      'Dropped readings that rose too far above the latest stored reading',
      {
        dropped: newReadings.length - kept.length,
        latestDepth: latest.depth,
        maxDepthRiseMetres,
      },
    );
  }
  return kept;
}

/** Fetches and stores one station's new readings. */
async function crawlStation(station: StationConfig, readingsLimit: number) {
  const latest = await traced('get latest reading', () =>
    readingStore.getLatestReading(station.id),
  );
  logger.info('Latest stored reading', {
    date: latest?.date.toISOString() ?? 'none',
  });

  const oldestDateLookup = new Date();
  oldestDateLookup.setDate(oldestDateLookup.getDate() - MAX_LOOKBACK_DAYS);

  let newReadings: Reading[];
  if (latest && latest.date.getTime() >= oldestDateLookup.getTime()) {
    newReadings = await traced('get readings since', () =>
      floodApi.getReadingsSince(station.measureId, latest.date),
    );
  } else {
    logger.info('No recent stored reading, backfilling', { readingsLimit });
    newReadings = await traced('get readings limit', () =>
      floodApi.getReadings(station.measureId, readingsLimit),
    );
  }
  logger.info('Retrieved readings', {
    count: newReadings.length,
    newest: newReadings[0]?.date.toISOString(),
    oldest: newReadings.at(-1)?.date.toISOString(),
  });

  const readingsToStore = dropSpikes(
    newReadings,
    latest,
    station.maxDepthRiseMetres ?? DEFAULT_MAX_DEPTH_RISE_METRES,
  );
  await traced('update readings', () =>
    readingStore.updateReadings(station.id, readingsToStore),
  );
}

/**
 * Crawls every configured station in turn. A station that fails is logged
 * and the rest still run; the invocation then fails, so the crawler error
 * alarm fires.
 */
export async function handler(event?: CrawlerEvent, context?: Context) {
  if (context) {
    logger.addContext(context);
  }
  const stations = parseStations(process.env.STATIONS);
  const readingsLimit = event?.readingsLimit || DEFAULT_READINGS_LIMIT;

  const failed: string[] = [];
  for (const station of stations) {
    logger.appendKeys({ station: station.id });
    try {
      await traced(`station ${station.id}`, () =>
        crawlStation(station, readingsLimit),
      );
    } catch (error) {
      logger.error('Crawl failed for station', { error: error as Error });
      failed.push(station.id);
    } finally {
      logger.removeKeys(['station']);
    }
  }

  if (failed.length) {
    throw new Error(`Crawl failed for stations: ${failed.join(', ')}`);
  }
}
