import {
  AttributeValue,
  DynamoDBClient,
  QueryCommand,
  QueryCommandInput,
} from '@aws-sdk/client-dynamodb';
import { tracer } from './powertools';
import { Reading } from '../storage-stack/reading';

// Created once per Lambda container and reused across invocations.
const dynamoDbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

function toReading(item: Record<string, AttributeValue>): Reading | null {
  if (!item.timestamp?.N || !item.reading_depth?.N) {
    return null;
  }
  return {
    date: new Date(Number.parseFloat(item.timestamp.N)),
    depth: Number.parseFloat(item.reading_depth.N),
  };
}

function toReadings(items: Record<string, AttributeValue>[] = []) {
  return items.map(toReading).filter((r): r is Reading => r !== null);
}

/** A station's latest `limit` readings, newest first. */
export async function getLatestReadings(station: string, limit: number) {
  const result = await dynamoDbClient.send(
    new QueryCommand({
      ExpressionAttributeValues: { ':station': { S: station } },
      KeyConditionExpression: 'station = :station',
      Limit: limit,
      ScanIndexForward: false,
      TableName: process.env.DYNAMODB_READINGS_TABLE,
    }),
  );
  return toReadings(result.Items);
}

/** All of a station's readings since `since`, oldest first, across as many pages as needed. */
export async function getReadingsSince(station: string, since: Date) {
  const readings: Reading[] = [];
  let exclusiveStartKey: QueryCommandInput['ExclusiveStartKey'];
  do {
    const result = await dynamoDbClient.send(
      new QueryCommand({
        ExclusiveStartKey: exclusiveStartKey,
        ExpressionAttributeNames: { '#timestamp': 'timestamp' },
        ExpressionAttributeValues: {
          ':station': { S: station },
          ':since': { N: since.getTime().toString() },
        },
        KeyConditionExpression: 'station = :station AND #timestamp >= :since',
        ScanIndexForward: true,
        TableName: process.env.DYNAMODB_READINGS_TABLE,
      }),
    );
    readings.push(...toReadings(result.Items));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return readings;
}
