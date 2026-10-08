import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { logger, tracer } from '../powertools';
import { Reading } from '../reading';

// The most UpdateItem calls in flight at once. A backfill writes up to 96
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

async function updateReading(station: string, reading: Reading) {
  try {
    await dynamoDbClient.send(
      new UpdateItemCommand({
        ExpressionAttributeValues: {
          ':reading_depth': { N: reading.depth.toString() },
        },
        Key: {
          station: { S: station },
          timestamp: { N: reading.date.getTime().toString() },
        },
        TableName: process.env.DYNAMODB_READINGS_TABLE,
        UpdateExpression: 'SET reading_depth = :reading_depth',
      }),
    );
  } catch (error) {
    logger.error('Error updating a reading in DynamoDB', {
      station,
      date: reading.date.toISOString(),
      error: error as Error,
    });
    throw error;
  }
}

/**
 * Writes a station's readings, creating new ones and overwriting existing
 * ones, with at most MAX_CONCURRENT_WRITES in flight.
 */
export async function updateReadings(station: string, readings: Reading[]) {
  for (let i = 0; i < readings.length; i += MAX_CONCURRENT_WRITES) {
    const batch = readings.slice(i, i + MAX_CONCURRENT_WRITES);
    await Promise.all(batch.map((reading) => updateReading(station, reading)));
  }
  logger.info('Readings updated', { station, count: readings.length });
}
