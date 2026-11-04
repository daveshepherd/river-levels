import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import { PostedState } from './decide';
import { tracer } from './powertools';
import type { FordState } from '../api-stack/status';

// Created once per Lambda container and reused across invocations.
const dynamoDbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

/** The last state posted about a station, or null if none is recorded. */
export async function getPostedState(
  station: string,
): Promise<PostedState | null> {
  const result = await dynamoDbClient.send(
    new GetItemCommand({
      ConsistentRead: true,
      Key: { station: { S: station } },
      TableName: process.env.STATE_TABLE,
    }),
  );
  const item = result.Item;
  if (!item?.state?.S || !item.postedAt?.N) {
    return null;
  }
  return {
    state: item.state.S as FordState,
    postedAt: Number.parseInt(item.postedAt.N, 10),
  };
}

/**
 * Replaces a station's record, but only if it still holds `expected`, so two
 * invocations can't both claim the same post. Returns false if the record
 * changed in the meantime.
 */
export async function replacePostedState(
  station: string,
  expected: PostedState | null,
  next: PostedState,
): Promise<boolean> {
  try {
    await dynamoDbClient.send(
      new PutItemCommand({
        ...(expected
          ? {
            ConditionExpression: '#state = :state AND postedAt = :postedAt',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':state': { S: expected.state },
              ':postedAt': { N: expected.postedAt.toString() },
            },
          }
          : { ConditionExpression: 'attribute_not_exists(station)' }),
        Item: {
          station: { S: station },
          state: { S: next.state },
          postedAt: { N: next.postedAt.toString() },
        },
        TableName: process.env.STATE_TABLE,
      }),
    );
    return true;
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      return false;
    }
    throw error;
  }
}
