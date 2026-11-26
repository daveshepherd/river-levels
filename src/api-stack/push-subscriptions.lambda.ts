import { createHash } from 'node:crypto';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import {
  DeleteItemCommand,
  DynamoDBClient,
  PutItemCommand,
} from '@aws-sdk/client-dynamodb';
import type {
  Context,
  LambdaFunctionURLEvent,
  APIGatewayProxyStructuredResultV2 as LambdaFunctionURLResult,
} from 'aws-lambda';

const logger = new Logger({ serviceName: 'push-subscriptions' });
const tracer = new Tracer({ serviceName: 'push-subscriptions' });

// Created once per Lambda container and reused across invocations.
const dynamoDbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

export const PATH = '/push/subscriptions';
/** Larger than any real subscription, which is under 1 KB. */
export const MAX_BODY_BYTES = 2048;

/**
 * The hosts of the browsers' push services: Chrome and Edge (FCM), Firefox
 * (Mozilla autopush), Safari (Apple) and older Edge (WNS). Endpoints anywhere
 * else are refused, so the deliverer only ever sends to a push service.
 */
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** A browser's PushSubscription, as PushSubscription.toJSON() returns it. */
export interface PushSubscriptionJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

class BadRequest extends Error {}

/** The item key: a hash of the endpoint, so the key never reveals it. */
export function subscriptionId(endpoint: string) {
  return createHash('sha256').update(endpoint).digest('hex');
}

function response(statusCode: number, error?: string): LambdaFunctionURLResult {
  return error
    ? {
      statusCode,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error }),
    }
    : { statusCode };
}

function parseBody(event: LambdaFunctionURLEvent): Record<string, unknown> {
  const body = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : (event.body ?? '');
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    throw new BadRequest('body too large');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new BadRequest('body is not JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new BadRequest('body is not an object');
  }
  return parsed as Record<string, unknown>;
}

/** Checks an endpoint is an https URL at a known push service. */
function parseEndpoint(value: unknown): URL {
  if (typeof value !== 'string') {
    throw new BadRequest('endpoint is missing');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new BadRequest('endpoint is not a URL');
  }
  if (
    url.protocol !== 'https:' ||
    url.port !== '' ||
    url.username !== '' ||
    !PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname))
  ) {
    throw new BadRequest('endpoint is not at a known push service');
  }
  return url;
}

/** Checks a base64url key decodes to the expected number of bytes. */
function parseKey(value: unknown, name: string, bytes: number): string {
  if (
    typeof value !== 'string' ||
    !BASE64URL.test(value) ||
    Buffer.from(value, 'base64url').length !== bytes
  ) {
    throw new BadRequest(`keys.${name} is not a ${bytes}-byte base64url value`);
  }
  return value;
}

/** Validates a subscription from the browser. */
export function parseSubscription(body: Record<string, unknown>): PushSubscriptionJson {
  const endpoint = parseEndpoint(body.endpoint);
  const keys = (body.keys ?? {}) as Record<string, unknown>;
  return {
    endpoint: endpoint.href,
    keys: {
      // An uncompressed P-256 public key and a 16-byte auth secret (RFC 8291)
      p256dh: parseKey(keys.p256dh, 'p256dh', 65),
      auth: parseKey(keys.auth, 'auth', 16),
    },
  };
}

async function subscribe(body: Record<string, unknown>) {
  const subscription = parseSubscription(body);
  const id = subscriptionId(subscription.endpoint);
  // Replaces an earlier subscription for the endpoint, whose keys may have changed
  await dynamoDbClient.send(
    new PutItemCommand({
      TableName: process.env.SUBSCRIPTIONS_TABLE,
      Item: {
        id: { S: id },
        endpoint: { S: subscription.endpoint },
        p256dh: { S: subscription.keys.p256dh },
        auth: { S: subscription.keys.auth },
        subscribedAt: { S: new Date().toISOString() },
      },
    }),
  );
  logger.info('Subscribed', {
    id,
    pushService: new URL(subscription.endpoint).hostname,
  });
}

async function unsubscribe(body: Record<string, unknown>) {
  const id = subscriptionId(parseEndpoint(body.endpoint).href);
  await dynamoDbClient.send(
    new DeleteItemCommand({
      TableName: process.env.SUBSCRIPTIONS_TABLE,
      Key: { id: { S: id } },
    }),
  );
  logger.info('Unsubscribed', { id });
}

/**
 * The web push subscription API, behind CloudFront at /push/subscriptions:
 * POST a browser's PushSubscription to get ford announcements, or DELETE with
 * its endpoint to stop them. The function URL answers CORS preflights. Other
 * failures are thrown, so the caller gets a 502 and can try again.
 *
 * Endpoints identify a browser, so they are never logged; log entries use the
 * subscription's ID, a hash of the endpoint.
 */
export async function handler(
  event: LambdaFunctionURLEvent,
  context?: Context,
): Promise<LambdaFunctionURLResult> {
  if (context) {
    logger.addContext(context);
  }
  if (event.rawPath !== PATH) {
    return response(404, 'not found');
  }
  const method = event.requestContext.http.method;
  try {
    if (method === 'POST') {
      await subscribe(parseBody(event));
      return response(201);
    }
    if (method === 'DELETE') {
      await unsubscribe(parseBody(event));
      return response(204);
    }
    return response(405, 'method not allowed');
  } catch (error) {
    if (error instanceof BadRequest) {
      logger.info('Refused a request', { method, reason: error.message });
      return response(400, error.message);
    }
    // Thrown, so the function's Errors metric, which the alarm watches, counts it
    logger.error('Storing the subscription failed', { method, error: error as Error });
    throw error;
  }
}
