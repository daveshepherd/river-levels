import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
  type AttributeValue,
} from '@aws-sdk/client-dynamodb';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { Context, SQSBatchResponse, SQSEvent } from 'aws-lambda';
import webpush, { WebPushError } from 'web-push';
import type { Announcement } from './announcement';
import { composePost, MESSAGES } from './messages';
import { parseStations } from '../storage-stack/stations';

const logger = new Logger({ serviceName: 'web-push-deliverer' });
const tracer = new Tracer({ serviceName: 'web-push-deliverer' });

// Created once per Lambda container and reused across invocations.
const dynamoDbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));
const ssmClient = tracer.captureAWSv3Client(new SSMClient({}));

/** Identifies the sender to the push services (RFC 8292). A URL, so no email address is published. */
export const VAPID_SUBJECT = 'https://kenilworthford.com';
/** How long a push service keeps trying an offline browser. Later than this, the news is stale. */
export const TTL_SECONDS = 6 * 60 * 60;
/** Sends in flight at once. */
const CONCURRENCY = 10;

/** The stage's VAPID key pair, stored in the VAPID keys parameter as JSON. */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

/** What the website's service worker receives and shows. */
export interface PushNotification {
  title: string;
  body: string;
  /** Opened when the notification is tapped. */
  url?: string;
  /** Replaces an earlier notification for the station rather than adding another. */
  tag: string;
  state: string;
  announcementId: string;
}

interface Subscription {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

let vapidKeys: VapidKeys | undefined;

/** Reads the VAPID keys parameter once per container, throwing if it hasn't been filled in. */
async function getVapidKeys(): Promise<VapidKeys> {
  if (!vapidKeys) {
    const result = await ssmClient.send(
      new GetParameterCommand({
        Name: process.env.VAPID_KEYS_PARAMETER,
        WithDecryption: true,
      }),
    );
    const keys = JSON.parse(result.Parameter?.Value ?? '{}') as Partial<VapidKeys>;
    if (!keys.publicKey || !keys.privateKey) {
      throw new Error('The VAPID keys parameter needs publicKey and privateKey');
    }
    vapidKeys = keys as VapidKeys;
  }
  return vapidKeys;
}

/** Every stored subscription. There are few enough to scan. */
async function getSubscriptions(): Promise<Subscription[]> {
  const subscriptions: Subscription[] = [];
  let startKey: Record<string, AttributeValue> | undefined;
  do {
    const page = await dynamoDbClient.send(
      new ScanCommand({
        TableName: process.env.SUBSCRIPTIONS_TABLE,
        ExclusiveStartKey: startKey,
      }),
    );
    for (const item of page.Items ?? []) {
      if (item.id?.S && item.endpoint?.S && item.p256dh?.S && item.auth?.S) {
        subscriptions.push({
          id: item.id.S,
          endpoint: item.endpoint.S,
          keys: { p256dh: item.p256dh.S, auth: item.auth.S },
        });
      }
    }
    startKey = page.LastEvaluatedKey;
  } while (startKey);
  return subscriptions;
}

/** The notification for an announcement, worded like the X post. */
export function composeNotification(
  announcement: Announcement,
  website?: string,
  random?: () => number,
): PushNotification {
  const station = announcement.station.charAt(0).toUpperCase() + announcement.station.slice(1);
  return {
    title: `${station} ford: ${announcement.state}`,
    // No "See ... for more details": tapping the notification opens the site
    body: composePost(announcement.transition, undefined, random),
    url: website,
    tag: announcement.station,
    state: announcement.state,
    announcementId: announcement.id,
  };
}

type Outcome = 'sent' | 'gone' | 'rejected' | 'failed';

/** Sends to one subscription. Endpoints are never logged, only the subscription ID. */
async function send(
  subscription: Subscription,
  payload: string,
  topic: string,
  keys: VapidKeys,
): Promise<Outcome> {
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      payload,
      {
        TTL: TTL_SECONDS,
        topic,
        urgency: 'high',
        vapidDetails: { subject: VAPID_SUBJECT, ...keys },
      },
    );
    return 'sent';
  } catch (error) {
    // Logs the status only: a WebPushError carries the endpoint
    const statusCode = error instanceof WebPushError ? error.statusCode : undefined;
    if (statusCode === 404 || statusCode === 410) {
      // The browser unsubscribed or the subscription expired
      await dynamoDbClient.send(
        new DeleteItemCommand({
          TableName: process.env.SUBSCRIPTIONS_TABLE,
          Key: { id: { S: subscription.id } },
        }),
      );
      logger.info('Removed a subscription that has gone', { id: subscription.id, statusCode });
      return 'gone';
    }
    if (statusCode === 400 || statusCode === 403 || statusCode === 413) {
      // Retrying won't help: bad keys, a VAPID key mismatch or too large
      logger.warn('A push service refused a notification', { id: subscription.id, statusCode });
      return 'rejected';
    }
    logger.warn('Sending a notification failed', {
      id: subscription.id,
      statusCode,
      errorName: (error as Error).name,
    });
    return 'failed';
  }
}

/** Runs the sends, CONCURRENCY at a time. */
async function sendAll(
  subscriptions: Subscription[],
  sendOne: (subscription: Subscription) => Promise<Outcome>,
) {
  const counts: Record<Outcome, number> = { sent: 0, gone: 0, rejected: 0, failed: 0 };
  let next = 0;
  const worker = async () => {
    while (next < subscriptions.length) {
      counts[await sendOne(subscriptions[next++])]++;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return counts;
}

async function deliver(announcement: Announcement, website?: string) {
  const subscriptions = await getSubscriptions();
  if (subscriptions.length === 0) {
    logger.info('No subscriptions to deliver to');
    return;
  }
  const keys = await getVapidKeys();
  const payload = JSON.stringify(composeNotification(announcement, website));
  const counts = await sendAll(subscriptions, (subscription) =>
    send(subscription, payload, announcement.station, keys),
  );
  logger.info('Delivered', { subscriptions: subscriptions.length, ...counts });
  if (counts.failed > 0) {
    // The retry sends to everyone again; the notification's tag means a
    // browser that already has it replaces it rather than showing two
    throw new Error(`${counts.failed} of ${subscriptions.length} sends failed`);
  }
}

/**
 * Receives ford state changes from the ford-announcements topic (through SQS,
 * with raw message delivery) and sends each, as a web push notification, to
 * every browser subscribed in the push-subscriptions table. Subscriptions the
 * push service says have gone (404 or 410) are deleted.
 *
 * An announcement with failed sends is reported back for retry; after 5
 * attempts it goes to the dead-letter queue.
 */
export async function handler(
  event: SQSEvent,
  context?: Context,
): Promise<SQSBatchResponse> {
  if (context) {
    logger.addContext(context);
  }
  const websites = new Map(
    parseStations(process.env.STATIONS).map((station) => [
      station.id,
      station.ford?.website,
    ]),
  );

  const failedMessageIds: string[] = [];
  for (const record of event.Records) {
    let announcement: Announcement;
    try {
      announcement = JSON.parse(record.body);
    } catch {
      logger.warn('Ignoring a message that is not JSON', { messageId: record.messageId });
      continue;
    }
    if (!Object.hasOwn(MESSAGES, announcement.transition)) {
      logger.warn('Ignoring a message that is not an announcement', {
        messageId: record.messageId,
      });
      continue;
    }
    logger.appendKeys({ station: announcement.station, announcementId: announcement.id });
    try {
      await deliver(announcement, websites.get(announcement.station));
    } catch (error) {
      logger.error('Delivering failed for announcement', { error: error as Error });
      failedMessageIds.push(record.messageId);
    } finally {
      logger.removeKeys(['station', 'announcementId']);
    }
  }
  return {
    batchItemFailures: failedMessageIds.map((itemIdentifier) => ({ itemIdentifier })),
  };
}
