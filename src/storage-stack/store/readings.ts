import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ReplicatedWriteConflictException,
} from '@aws-sdk/client-dynamodb';
import { logger, tracer } from '../powertools';
import { Reading } from '../reading';

// The most writes in flight at once. A backfill writes up to 96
// readings; this keeps a burst of writes from all landing at the same moment.
export const MAX_CONCURRENT_WRITES = 10;

// Created once per Lambda container and reused across invocations.
const dynamoDbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

/** The most recent stored reading for a station, or null if there are none. */
export async function getLatestReading(
  station: string,
): Promise<Reading | null> {
  let result;
  try {
    result = await dynamoDbClient.send(
      new QueryCommand({
        ExpressionAttributeValues: {
          ':station': { S: station },
        },
        KeyConditionExpression: 'station = :station',
        Limit: 1,
        ScanIndexForward: false,
        TableName: process.env.DYNAMODB_READINGS_TABLE,
      }),
    );
  } catch (error) {
    logger.error('Error retrieving the latest reading from DynamoDB', {
      station,
      error: error as Error,
    });
    throw error;
  }

  const item = result.Items?.length === 1 ? result.Items[0] : undefined;
  if (item?.timestamp?.N && item.reading_depth?.N) {
    return {
      date: new Date(Number.parseFloat(item.timestamp.N)),
      depth: Number.parseFloat(item.reading_depth.N),
    };
  }
  return null;
}

/** How many times to retry a write that conflicts with another region's write to the same reading. */
export const MAX_CONFLICT_RETRIES = 3;

/**
 * Creates a reading unless it already exists, recording the region that wrote
 * it. On a multi-Region strong consistency table the condition sees writes
 * from every region, so when crawlers in several regions fetch the same
 * reading only one creates it. Returns whether this call created it.
 */
async function putNewReading(
  station: string,
  reading: Reading,
  origin: string,
): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    try {
      await dynamoDbClient.send(
        new PutItemCommand({
          ConditionExpression: 'attribute_not_exists(#timestamp)',
          ExpressionAttributeNames: { '#timestamp': 'timestamp' },
          Item: {
            station: { S: station },
            timestamp: { N: reading.date.getTime().toString() },
            reading_depth: { N: reading.depth.toString() },
            origin: { S: origin },
          },
          TableName: process.env.DYNAMODB_READINGS_TABLE,
        }),
      );
      return true;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        return false;
      }
      // Another region is writing the same reading: once it finishes, the
      // retry fails the condition instead
      if (
        error instanceof ReplicatedWriteConflictException &&
        attempt < MAX_CONFLICT_RETRIES
      ) {
        continue;
      }
      logger.error('Error writing a reading to DynamoDB', {
        station,
        date: reading.date.toISOString(),
        error: error as Error,
      });
      throw error;
    }
  }
}

/**
 * Writes a station's readings, with at most MAX_CONCURRENT_WRITES in flight.
 * Only creates readings that don't exist yet, tagged with READINGS_ORIGIN,
 * this crawler's region.
 */
export async function updateReadings(station: string, readings: Reading[]) {
  const origin = process.env.READINGS_ORIGIN;
  if (!origin) {
    throw new Error('READINGS_ORIGIN must be set to the crawler\'s region');
  }
  let created = 0;
  for (let i = 0; i < readings.length; i += MAX_CONCURRENT_WRITES) {
    const batch = readings.slice(i, i + MAX_CONCURRENT_WRITES);
    const results = await Promise.all(
      batch.map((reading) => putNewReading(station, reading, origin)),
    );
    created += results.filter(Boolean).length;
  }
  logger.info('Readings written', {
    station,
    created,
    alreadyPresent: readings.length - created,
  });
}
