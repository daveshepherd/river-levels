import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ReplicatedWriteConflictException,
} from '@aws-sdk/client-dynamodb';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { COOLDOWN_MS } from '../../src/notifications-stack/decide';
import * as target from '../../src/notifications-stack/ford-announcer.lambda';

const dynamoDbMock = mockClient(DynamoDBClient);
const snsMock = mockClient(SNSClient);

const NOW = 1_800_000_000_000;
const TOPIC = 'arn:aws:sns:eu-west-2:123456789012:ford-announcements';

function statusMessage(state: string | undefined, lastUpdate = '2027-01-15T08:00:00.000Z') {
  return JSON.stringify({
    station: 'kenilworth',
    depth: 1.3,
    direction: 'rising',
    rate: 'fast',
    ...(state ? { state } : {}),
    lastUpdate,
  });
}

function sqsEvent(...bodies: string[]): SQSEvent {
  return {
    Records: bodies.map((body, i) => ({ messageId: `m${i + 1}`, body })),
  } as SQSEvent;
}

function stored(state: string, postedAt: number) {
  dynamoDbMock.on(GetItemCommand).resolves({
    Item: {
      station: { S: 'kenilworth' },
      state: { S: state },
      postedAt: { N: postedAt.toString() },
    },
  });
}

function puts() {
  return dynamoDbMock.commandCalls(PutItemCommand).map((c) => c.args[0].input);
}

function announcements() {
  return snsMock.commandCalls(PublishCommand).map((c) => JSON.parse(c.args[0].input.Message!));
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  dynamoDbMock.reset();
  snsMock.reset();
  dynamoDbMock.on(GetItemCommand).resolves({});
  dynamoDbMock.on(PutItemCommand).resolves({});
  snsMock.on(PublishCommand).resolves({ MessageId: 'sns-1' });
  process.env.STATE_TABLE = 'state-table';
  process.env.ANNOUNCEMENTS_TOPIC_ARN = TOPIC;
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ford-announcer', () => {
  it('records the first state without announcing', async () => {
    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);
    expect(puts()).toStrictEqual([
      {
        ConditionExpression: 'attribute_not_exists(station)',
        Item: {
          station: { S: 'kenilworth' },
          state: { S: 'flooded' },
          postedAt: { N: '0' },
        },
        TableName: 'state-table',
      },
    ]);
  });

  it('does nothing when the state is unchanged', async () => {
    stored('flooded', 0);

    await target.handler(sqsEvent(statusMessage('flooded')));

    expect(puts()).toHaveLength(0);
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);
  });

  it('holds a change back during the cooldown', async () => {
    stored('flooded', NOW - COOLDOWN_MS + 60_000);

    await target.handler(sqsEvent(statusMessage('clear')));

    expect(puts()).toHaveLength(0);
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);
  });

  it('claims the change, then announces it once', async () => {
    stored('clear', 0);

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(puts()).toStrictEqual([
      {
        ConditionExpression: '#state = :state AND postedAt = :postedAt',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':state': { S: 'clear' },
          ':postedAt': { N: '0' },
        },
        Item: {
          station: { S: 'kenilworth' },
          state: { S: 'flooded' },
          postedAt: { N: NOW.toString() },
        },
        TableName: 'state-table',
      },
    ]);
    expect(snsMock).toHaveReceivedCommandWith(PublishCommand, { TopicArn: TOPIC });
    expect(announcements()).toStrictEqual([
      {
        id: `kenilworth:flooded:${NOW}`,
        station: 'kenilworth',
        transition: 'risingFlooded',
        state: 'flooded',
        previousState: 'clear',
        depth: 1.3,
        lastUpdate: '2027-01-15T08:00:00.000Z',
        announcedAt: new Date(NOW).toISOString(),
      },
    ]);
  });

  it('does not announce when another invocation claimed the change first', async () => {
    stored('clear', 0);
    dynamoDbMock.on(PutItemCommand).rejects(
      new ConditionalCheckFailedException({ message: 'taken', $metadata: {} }),
    );

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);
  });

  it('retries the station when another region is writing the record at the same time', async () => {
    stored('clear', 0);
    dynamoDbMock.on(PutItemCommand).rejects(
      new ReplicatedWriteConflictException({ message: 'conflict', $metadata: {} }),
    );

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    // The retry reads the record again, so it sees the other region's claim
    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'm1' }],
    });
    expect(snsMock).toHaveReceivedCommandTimes(PublishCommand, 0);
  });

  it('restores the record and retries the station when publishing fails', async () => {
    stored('clear', 0);
    snsMock.on(PublishCommand).rejects(new Error('SNS is down'));

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'm1' }],
    });
    const [claim, restore] = puts();
    expect(claim.Item?.state).toStrictEqual({ S: 'flooded' });
    expect(restore).toMatchObject({
      ExpressionAttributeValues: {
        ':state': { S: 'flooded' },
        ':postedAt': { N: NOW.toString() },
      },
      Item: { state: { S: 'clear' }, postedAt: { N: '0' } },
    });
  });

  it('uses the newest status for a station and reports all its messages on failure', async () => {
    stored('clear', 0);
    snsMock.on(PublishCommand).rejects(new Error('SNS is down'));

    const response = await target.handler(
      sqsEvent(
        statusMessage('impassable', '2027-01-15T08:15:00.000Z'),
        statusMessage('clear', '2027-01-15T08:00:00.000Z'),
        statusMessage('flooded', '2027-01-15T08:30:00.000Z'),
      ),
    );

    expect(puts()[0].Item?.state).toStrictEqual({ S: 'flooded' });
    expect(response.batchItemFailures).toStrictEqual([
      { itemIdentifier: 'm1' },
      { itemIdentifier: 'm2' },
      { itemIdentifier: 'm3' },
    ]);
  });

  it('ignores statuses without a ford state and messages that are not JSON', async () => {
    const response = await target.handler(
      sqsEvent(statusMessage(undefined), 'not json'),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(dynamoDbMock).toHaveReceivedCommandTimes(GetItemCommand, 0);
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    await expect(
      target.handler(sqsEvent(), { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ batchItemFailures: [] });
  });
});

describe('getPostedState', () => {
  it('treats an incomplete record as none', async () => {
    dynamoDbMock.on(GetItemCommand).resolves({
      Item: { station: { S: 'kenilworth' }, state: { S: 'clear' } },
    });

    await target.handler(sqsEvent(statusMessage('flooded')));

    expect(puts()[0].ConditionExpression).toBe('attribute_not_exists(station)');
  });

  it('rethrows errors other than a lost claim', async () => {
    stored('clear', 0);
    dynamoDbMock.on(PutItemCommand).rejects(new Error('throttled'));

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response.batchItemFailures).toHaveLength(1);
  });
});
