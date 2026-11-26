import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import type { Context, LambdaFunctionURLEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import * as target from '../../src/api-stack/push-subscriptions.lambda';

const dynamoDbMock = mockClient(DynamoDBClient);

const NOW = 1_800_000_000_000;
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123:xyz';
// An uncompressed P-256 public key (65 bytes) and an auth secret (16 bytes)
const P256DH = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString('base64url');
const AUTH = Buffer.alloc(16, 2).toString('base64url');

function request(
  method: string,
  body?: unknown,
  overrides: Partial<LambdaFunctionURLEvent> = {},
): LambdaFunctionURLEvent {
  return {
    rawPath: '/push/subscriptions',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: { http: { method } },
    ...overrides,
  } as LambdaFunctionURLEvent;
}

function subscription(overrides: Record<string, unknown> = {}) {
  return {
    endpoint: ENDPOINT,
    expirationTime: null,
    keys: { p256dh: P256DH, auth: AUTH },
    ...overrides,
  };
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  dynamoDbMock.reset();
  dynamoDbMock.on(PutItemCommand).resolves({});
  dynamoDbMock.on(DeleteItemCommand).resolves({});
  process.env.SUBSCRIPTIONS_TABLE = 'push-subscriptions';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('push-subscriptions', () => {
  it('stores a subscription under a hash of its endpoint', async () => {
    const response = await target.handler(request('POST', subscription()));

    expect(response).toStrictEqual({ statusCode: 201 });
    expect(dynamoDbMock).toHaveReceivedCommandWith(PutItemCommand, {
      TableName: 'push-subscriptions',
      Item: {
        id: { S: target.subscriptionId(ENDPOINT) },
        endpoint: { S: ENDPOINT },
        p256dh: { S: P256DH },
        auth: { S: AUTH },
        subscribedAt: { S: new Date(NOW).toISOString() },
      },
    });
  });

  it('uses a SHA-256 hex digest as the ID', () => {
    expect(target.subscriptionId(ENDPOINT)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reads a base64-encoded body', async () => {
    const body = Buffer.from(JSON.stringify(subscription())).toString('base64');

    const response = await target.handler(
      request('POST', body, { isBase64Encoded: true }),
    );

    expect(response.statusCode).toBe(201);
  });

  it.each([
    'https://fcm.googleapis.com/fcm/send/a',
    'https://updates.push.services.mozilla.com/wpush/v2/a',
    'https://web.push.apple.com/a',
    'https://wns2-par02p.notify.windows.com/w/?token=a',
  ])('accepts an endpoint at %s', async (endpoint) => {
    const response = await target.handler(request('POST', subscription({ endpoint })));

    expect(response.statusCode).toBe(201);
  });

  it.each([
    ['a missing endpoint', subscription({ endpoint: undefined })],
    ['an endpoint that is not a URL', subscription({ endpoint: 'not a url' })],
    ['an http endpoint', subscription({ endpoint: 'http://fcm.googleapis.com/a' })],
    ['an endpoint at another host', subscription({ endpoint: 'https://example.com/a' })],
    ['a lookalike host', subscription({ endpoint: 'https://fcm.googleapis.com.example.com/a' })],
    ['an endpoint with a port', subscription({ endpoint: 'https://fcm.googleapis.com:8443/a' })],
    ['an endpoint with credentials', subscription({ endpoint: 'https://u:p@fcm.googleapis.com/a' })],
    ['missing keys', subscription({ keys: undefined })],
    ['a short p256dh key', subscription({ keys: { p256dh: AUTH, auth: AUTH } })],
    ['a long auth secret', subscription({ keys: { p256dh: P256DH, auth: P256DH } })],
    ['a key that is not base64url', subscription({ keys: { p256dh: P256DH, auth: '!'.repeat(22) } })],
    ['a body that is not JSON', 'not json'],
    ['a body that is not an object', [subscription()]],
    ['a body that is too large', subscription({ padding: 'x'.repeat(target.MAX_BODY_BYTES) })],
  ])('refuses %s', async (_, body) => {
    const response = await target.handler(request('POST', body));

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body!)).toHaveProperty('error');
    expect(dynamoDbMock).toHaveReceivedCommandTimes(PutItemCommand, 0);
  });

  it('refuses a missing body', async () => {
    const response = await target.handler(
      request('POST', undefined, { body: undefined }),
    );

    expect(response.statusCode).toBe(400);
  });

  it('removes a subscription by its endpoint', async () => {
    const response = await target.handler(request('DELETE', { endpoint: ENDPOINT }));

    expect(response).toStrictEqual({ statusCode: 204 });
    expect(dynamoDbMock).toHaveReceivedCommandWith(DeleteItemCommand, {
      TableName: 'push-subscriptions',
      Key: { id: { S: target.subscriptionId(ENDPOINT) } },
    });
  });

  it('refuses to remove a subscription without a valid endpoint', async () => {
    const response = await target.handler(request('DELETE', {}));

    expect(response.statusCode).toBe(400);
    expect(dynamoDbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 0);
  });

  it('answers other paths with 404', async () => {
    const response = await target.handler(
      request('POST', subscription(), { rawPath: '/push/other' }),
    );

    expect(response.statusCode).toBe(404);
  });

  it('answers other methods with 405', async () => {
    const response = await target.handler(request('GET'));

    expect(response.statusCode).toBe(405);
  });

  it('throws when the table write fails, so the Errors alarm sees it', async () => {
    dynamoDbMock.on(PutItemCommand).rejects(new Error('throttled'));

    await expect(target.handler(request('POST', subscription()))).rejects.toThrow(
      'throttled',
    );
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    const response = await target.handler(request('GET'), {
      awsRequestId: 'req-1',
    } as Context);

    expect(response.statusCode).toBe(405);
  });
});
