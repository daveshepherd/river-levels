import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { COOLDOWN_MS } from '../../src/notifications-stack/decide';
import { resetXClient } from '../../src/notifications-stack/x-client';
import * as target from '../../src/notifications-stack/x-notifier.lambda';

const tweet = jest.fn();
const twitterApi = jest.fn();
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation((credentials) => {
    twitterApi(credentials);
    return { readWrite: { v2: { tweet } } };
  }),
}));

const dynamoDbMock = mockClient(DynamoDBClient);
const secretsMock = mockClient(SecretsManagerClient);

const NOW = 1_800_000_000_000;
const CREDENTIALS = {
  appKey: 'k',
  appSecret: 's',
  accessToken: 't',
  accessSecret: 'a',
};

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

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  dynamoDbMock.reset();
  secretsMock.reset();
  tweet.mockReset();
  twitterApi.mockReset();
  resetXClient();
  dynamoDbMock.on(GetItemCommand).resolves({});
  dynamoDbMock.on(PutItemCommand).resolves({});
  secretsMock
    .on(GetSecretValueCommand)
    .resolves({ SecretString: JSON.stringify(CREDENTIALS) });
  tweet.mockResolvedValue({ data: { id: '123', text: '' } });
  process.env.MODE = 'post';
  process.env.STATE_TABLE = 'state-table';
  process.env.X_CREDENTIALS_SECRET_ARN = 'secret-arn';
  process.env.STATIONS = JSON.stringify([
    {
      id: 'kenilworth',
      measureId: 'm',
      ford: {
        floodedAboveMetres: 1.23,
        impassableAboveMetres: 1.4,
        website: 'https://kenilworthford.com',
      },
    },
  ]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('x-notifier', () => {
  it('records the first state without posting', async () => {
    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(tweet).not.toHaveBeenCalled();
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
    expect(tweet).not.toHaveBeenCalled();
  });

  it('holds a change back during the cooldown', async () => {
    stored('flooded', NOW - COOLDOWN_MS + 60_000);

    await target.handler(sqsEvent(statusMessage('clear')));

    expect(puts()).toHaveLength(0);
    expect(tweet).not.toHaveBeenCalled();
  });

  it('claims the change, then posts it with the ford website', async () => {
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
    expect(twitterApi).toHaveBeenCalledWith(CREDENTIALS);
    expect(tweet).toHaveBeenCalledTimes(1);
    expect(tweet.mock.calls[0][0]).toMatch(
      / See https:\/\/kenilworthford\.com for more details\.$/,
    );
  });

  it('only logs in log mode, but still records the change', async () => {
    process.env.MODE = 'log';
    stored('clear', 0);

    await target.handler(sqsEvent(statusMessage('flooded')));

    expect(puts()).toHaveLength(1);
    expect(tweet).not.toHaveBeenCalled();
    expect(secretsMock).toHaveReceivedCommandTimes(GetSecretValueCommand, 0);
  });

  it('does not post when another invocation claimed the change first', async () => {
    stored('clear', 0);
    dynamoDbMock.on(PutItemCommand).rejects(
      new ConditionalCheckFailedException({ message: 'taken', $metadata: {} }),
    );

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(tweet).not.toHaveBeenCalled();
  });

  it('restores the record and retries the station when posting fails', async () => {
    stored('clear', 0);
    tweet.mockRejectedValue(new Error('X is down'));

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

  it('fails the station when the credentials secret is not filled in', async () => {
    stored('clear', 0);
    secretsMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({ ...CREDENTIALS, appKey: '', accessSecret: '' }),
    });

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'm1' }],
    });
    expect(tweet).not.toHaveBeenCalled();
  });

  it('fails the station when the secret has no value', async () => {
    stored('clear', 0);
    secretsMock.on(GetSecretValueCommand).resolves({});

    const response = await target.handler(sqsEvent(statusMessage('flooded')));

    expect(response.batchItemFailures).toHaveLength(1);
  });

  it('uses the newest status for a station and reports all its messages on failure', async () => {
    stored('clear', 0);
    tweet.mockRejectedValue(new Error('X is down'));

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

  it('reuses the X client within a container', async () => {
    stored('clear', 0);
    await target.handler(sqsEvent(statusMessage('flooded')));
    stored('flooded', 0);
    await target.handler(sqsEvent(statusMessage('clear')));

    expect(tweet).toHaveBeenCalledTimes(2);
    expect(secretsMock).toHaveReceivedCommandTimes(GetSecretValueCommand, 1);
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
