import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { logger, tracer } from './powertools';
import { getLatestReadings, getReadingsSince } from './readings';
import { getStationStatus, STATUS_READINGS } from './status';
import { parseStations, StationConfig } from '../storage-stack/stations';

/** How far back the chart goes. */
export const CHART_DAYS = 365;

/** How long browsers and CloudFront may cache the published files. */
export const CACHE_CONTROL = 'max-age=300';

// Created once per Lambda container and reused across invocations.
const s3Client = tracer.captureAWSv3Client(new S3Client({}));

/** The S3 keys a station's files are published to. */
export function stationKeys(stationId: string) {
  return {
    status: `stations/${stationId}/status.json`,
    chart: `stations/${stationId}/chart.json`,
  };
}

async function putJson(key: string, body: unknown) {
  await s3Client.send(
    new PutObjectCommand({
      Body: JSON.stringify(body),
      Bucket: process.env.API_BUCKET,
      CacheControl: CACHE_CONTROL,
      ContentType: 'application/json',
      Key: key,
    }),
  );
}

/** Regenerates a station's status and chart files from the table. */
async function publishStation(station: StationConfig) {
  const keys = stationKeys(station.id);

  const latest = await getLatestReadings(station.id, STATUS_READINGS);
  const status = getStationStatus(latest, station.ford);
  if (!status) {
    logger.warn('No readings stored for station, nothing to publish');
    return;
  }
  await putJson(keys.status, status);

  const since = new Date();
  since.setDate(since.getDate() - CHART_DAYS);
  const chart = (await getReadingsSince(station.id, since)).map((reading) => [
    reading.date.getTime(),
    reading.depth,
  ]);
  await putJson(keys.chart, chart);

  logger.info('Published station', {
    state: status.state,
    direction: status.direction,
    chartPoints: chart.length,
  });
}

/**
 * Receives new-reading notifications from the river-levels-notifications
 * topic (through SQS, with raw message delivery) and republishes the status
 * and chart of each station they mention, once per batch.
 *
 * A station that fails has its messages reported back for retry; the others
 * are still published.
 */
export async function handler(
  event: SQSEvent,
  context?: Context,
): Promise<SQSBatchResponse> {
  if (context) {
    logger.addContext(context);
  }
  const stations = new Map(
    parseStations(process.env.STATIONS).map((station) => [station.id, station]),
  );

  const messageIdsByStation = new Map<string, string[]>();
  for (const record of event.Records) {
    let stationId: unknown;
    try {
      stationId = JSON.parse(record.body).station;
    } catch {
      stationId = undefined;
    }
    if (typeof stationId !== 'string' || !stations.has(stationId)) {
      logger.warn('Ignoring a message for an unknown station', {
        messageId: record.messageId,
        station: stationId,
      });
      continue;
    }
    const ids = messageIdsByStation.get(stationId) ?? [];
    ids.push(record.messageId);
    messageIdsByStation.set(stationId, ids);
  }

  const failedMessageIds: string[] = [];
  for (const [stationId, messageIds] of messageIdsByStation) {
    logger.appendKeys({ station: stationId });
    try {
      await publishStation(stations.get(stationId)!);
    } catch (error) {
      logger.error('Publishing failed for station', { error: error as Error });
      failedMessageIds.push(...messageIds);
    } finally {
      logger.removeKeys(['station']);
    }
  }

  return {
    batchItemFailures: failedMessageIds.map((itemIdentifier) => ({
      itemIdentifier,
    })),
  };
}
