import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import type { Announcement } from '../../src/notifications-stack/announcement';
import { MESSAGES } from '../../src/notifications-stack/messages';

const sendNotification = jest.fn();
jest.mock('web-push', () => {
  const actual = jest.requireActual('web-push');
  return {
    __esModule: true,
    default: { ...actual, sendNotification },
    WebPushError: actual.WebPushError,
  };
});
// eslint-disable-next-line import/order
import { WebPushError } from 'web-push';
// eslint-disable-next-line import/order
import * as target from '../../src/notifications-stack/web-push-deliverer.lambda';

const dynamoDbMock = mockClient(DynamoDBClient);
const ssmMock = mockClient(SSMClient);

const KEYS = { publicKey: 'public-key', privateKey: 'private-key' };

const announcement: Announcement = {
  id: 'kenilworth:flooded:1800000000000',
  station: 'kenilworth',
  transition: 'risingFlooded',
  state: 'flooded',
  previousState: 'clear',
  depth: 1.3,
  lastUpdate: '2027-01-15T08:00:00.000Z',
  announcedAt: '2027-01-15T08:01:00.000Z',
};

function sqsEvent(...bodies: string[]): SQSEvent {
  return {
    Records: bodies.map((body, i) => ({ messageId: `m${i + 1}`, body })),
  } as SQSEvent;
}

function item(id: string) {
  return {
    id: { S: id },
    endpoint: { S: `https://fcm.googleapis.com/fcm/send/${id}` },
    p256dh: { S: `p256dh-${id}` },
    auth: { S: `auth-${id}` },
    subscribedAt: { S: '2027-01-01T00:00:00.000Z' },
  };
}

function pushError(statusCode: number) {
  return new WebPushError('push failed', statusCode, {}, '', 'https://fcm.googleapis.com/x');
}

beforeEach(() => {
  dynamoDbMock.reset();
  ssmMock.reset();
  sendNotification.mockReset();
  sendNotification.mockResolvedValue({ statusCode: 201 });
  dynamoDbMock.on(ScanCommand).resolves({ Items: [item('a'), item('b')] });
  dynamoDbMock.on(DeleteItemCommand).resolves({});
  ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: JSON.stringify(KEYS) } });
  process.env.SUBSCRIPTIONS_TABLE = 'push-subscriptions';
  process.env.VAPID_KEYS_PARAMETER = '/river-levels/vapid-keys';
  process.env.STATIONS = JSON.stringify([
    {
      id: 'kenilworth',
      measureId: 'm',
      ford: { floodedAboveMetres: 1.23, impassableAboveMetres: 1.4, website: 'https://kenilworthford.com' },
    },
  ]);
});

describe('web-push-deliverer', () => {
  it('sends the notification to every subscription', async () => {
    const response = await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(sendNotification).toHaveBeenCalledTimes(2);
    const [subscription, payload, options] = sendNotification.mock.calls[0];
    expect(subscription).toStrictEqual({
      endpoint: 'https://fcm.googleapis.com/fcm/send/a',
      keys: { p256dh: 'p256dh-a', auth: 'auth-a' },
    });
    expect(JSON.parse(payload)).toMatchObject({
      title: 'Kenilworth ford: flooded',
      url: 'https://kenilworthford.com',
      tag: 'kenilworth',
      state: 'flooded',
      announcementId: announcement.id,
    });
    expect(MESSAGES.risingFlooded).toContain(JSON.parse(payload).body);
    expect(options).toStrictEqual({
      TTL: target.TTL_SECONDS,
      topic: 'kenilworth',
      urgency: 'high',
      vapidDetails: { subject: target.VAPID_SUBJECT, ...KEYS },
    });
  });

  it('reads every page of subscriptions', async () => {
    dynamoDbMock
      .on(ScanCommand)
      .resolvesOnce({ Items: [item('a')], LastEvaluatedKey: { id: { S: 'a' } } })
      .resolvesOnce({ Items: [item('b'), { id: { S: 'incomplete' } }] });

    await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(dynamoDbMock).toHaveReceivedCommandWith(ScanCommand, {
      ExclusiveStartKey: { id: { S: 'a' } },
    });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('does nothing, and needs no keys, without subscriptions', async () => {
    dynamoDbMock.on(ScanCommand).resolves({});

    const response = await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(sendNotification).not.toHaveBeenCalled();
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 0);
  });

  it.each([404, 410])('deletes a subscription the push service says has gone (%i)', async (status) => {
    sendNotification.mockRejectedValueOnce(pushError(status));

    const response = await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(dynamoDbMock).toHaveReceivedCommandWith(DeleteItemCommand, {
      TableName: 'push-subscriptions',
      Key: { id: { S: 'a' } },
    });
  });

  it.each([400, 403, 413])('skips a subscription the push service refuses (%i) without retrying', async (status) => {
    sendNotification.mockRejectedValueOnce(pushError(status));

    const response = await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(dynamoDbMock).toHaveReceivedCommandTimes(DeleteItemCommand, 0);
  });

  it.each([
    ['a 429', () => pushError(429)],
    ['a 500', () => pushError(500)],
    ['a network error', () => new Error('ECONNRESET')],
  ])('retries the announcement after %s', async (_, error) => {
    sendNotification.mockRejectedValueOnce(error());

    const response = await target.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [{ itemIdentifier: 'm1' }] });
    expect(sendNotification).toHaveBeenCalledTimes(2);
  });

  it('retries the announcement when the VAPID keys are missing', async () => {
    ssmMock.on(GetParameterCommand).resolves({ Parameter: { Value: '{}' } });
    // A fresh module, without keys cached by earlier tests
    let isolated: typeof target;
    jest.isolateModules(() => {
      isolated = jest.requireActual('../../src/notifications-stack/web-push-deliverer.lambda');
    });

    const response = await isolated!.handler(sqsEvent(JSON.stringify(announcement)));

    expect(response).toStrictEqual({ batchItemFailures: [{ itemIdentifier: 'm1' }] });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('ignores messages that are not announcements or not JSON', async () => {
    const response = await target.handler(
      sqsEvent(JSON.stringify({ station: 'kenilworth', state: 'flooded' }), 'not json'),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(dynamoDbMock).toHaveReceivedCommandTimes(ScanCommand, 0);
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    await expect(
      target.handler(sqsEvent(), { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ batchItemFailures: [] });
  });
});

describe('composeNotification', () => {
  it('words the notification like the X post, without the link', () => {
    expect(target.composeNotification(announcement, 'https://kenilworthford.com', () => 0)).toStrictEqual({
      title: 'Kenilworth ford: flooded',
      body: MESSAGES.risingFlooded[0],
      url: 'https://kenilworthford.com',
      tag: 'kenilworth',
      state: 'flooded',
      announcementId: announcement.id,
    });
  });
});
