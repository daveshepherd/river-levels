import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import * as target from '../../src/api-stack/api-publisher.lambda';

const dynamoDbMock = mockClient(DynamoDBClient);
const s3Mock = mockClient(S3Client);

const KENILWORTH = {
  id: 'kenilworth',
  measureId: '2627-level-stage-i-15_min-mASD',
  ford: { floodedAboveMetres: 1.23, impassableAboveMetres: 1.4 },
};

function item(station: string, timestamp: number, depth: number) {
  return {
    station: { S: station },
    timestamp: { N: timestamp.toString() },
    reading_depth: { N: depth.toString() },
  };
}

function sqsEvent(...messages: Array<{ id: string; body: string }>): SQSEvent {
  return {
    Records: messages.map(({ id, body }) => ({ messageId: id, body })),
  } as SQSEvent;
}

function readingMessage(station: string) {
  return JSON.stringify({
    reading_depth: 1.3,
    station,
    timestamp: 1577891700000,
  });
}

/** Responds to the status query (Limit set) and the chart query (no Limit). */
function mockReadings(statusItems: object[], chartItems: object[]) {
  dynamoDbMock
    .on(QueryCommand)
    .callsFake(async (input) =>
      input.Limit ? { Items: statusItems } : { Items: chartItems },
    );
}

function putBody(key: string) {
  const call = s3Mock
    .commandCalls(PutObjectCommand)
    .find((c) => c.args[0].input.Key === key);
  return call ? JSON.parse(call.args[0].input.Body as string) : undefined;
}

beforeEach(() => {
  dynamoDbMock.reset();
  s3Mock.reset();
  process.env.API_BUCKET = 'api-bucket';
  process.env.DYNAMODB_READINGS_TABLE = 'readings-table';
  process.env.STATIONS = JSON.stringify([KENILWORTH]);
});

describe('api-publisher', () => {
  it('publishes the status and chart for a station once per batch', async () => {
    mockReadings(
      [item('kenilworth', 1577891700000, 1.3), item('kenilworth', 1577890800000, 1.25)],
      [item('kenilworth', 1577890800000, 1.25), item('kenilworth', 1577891700000, 1.3)],
    );

    const response = await target.handler(
      sqsEvent(
        { id: 'm1', body: readingMessage('kenilworth') },
        { id: 'm2', body: readingMessage('kenilworth') },
      ),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 2);
    expect(putBody('stations/kenilworth/status.json')).toStrictEqual({
      depth: 1.3,
      direction: 'rising',
      rate: 'fast',
      state: 'flooded',
      lastUpdate: '2020-01-01T15:15:00.000Z',
    });
    expect(putBody('stations/kenilworth/chart.json')).toStrictEqual([
      [1577890800000, 1.25],
      [1577891700000, 1.3],
    ]);
    expect(s3Mock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: 'api-bucket',
      CacheControl: 'max-age=300',
      ContentType: 'application/json',
      Key: 'stations/kenilworth/status.json',
    });
  });

  it('queries the latest 12 readings for the status and a year of readings for the chart', async () => {
    jest.useFakeTimers({ now: new Date('2021-06-01T12:00:00Z') });
    mockReadings([item('kenilworth', 1577891700000, 0.8)], []);

    await target.handler(sqsEvent({ id: 'm1', body: readingMessage('kenilworth') }));
    jest.useRealTimers();

    const [statusQuery, chartQuery] = dynamoDbMock
      .commandCalls(QueryCommand)
      .map((c) => c.args[0].input);
    expect(statusQuery).toMatchObject({
      Limit: 12,
      ScanIndexForward: false,
      TableName: 'readings-table',
      ExpressionAttributeValues: { ':station': { S: 'kenilworth' } },
    });
    expect(chartQuery).toMatchObject({
      ScanIndexForward: true,
      KeyConditionExpression: 'station = :station AND #timestamp >= :since',
      ExpressionAttributeValues: {
        ':since': { N: new Date('2020-06-01T12:00:00Z').getTime().toString() },
      },
    });
  });

  it('reads every page of the chart query', async () => {
    let chartPage = 0;
    dynamoDbMock.on(QueryCommand).callsFake(async (input) => {
      if (input.Limit) {
        return { Items: [item('kenilworth', 3, 0.8)] };
      }
      chartPage++;
      return chartPage === 1
        ? { Items: [item('kenilworth', 1, 0.7)], LastEvaluatedKey: { k: { S: '1' } } }
        : { Items: [item('kenilworth', 2, 0.75)] };
    });

    await target.handler(sqsEvent({ id: 'm1', body: readingMessage('kenilworth') }));

    expect(putBody('stations/kenilworth/chart.json')).toStrictEqual([
      [1, 0.7],
      [2, 0.75],
    ]);
    const secondPage = dynamoDbMock.commandCalls(QueryCommand)[2].args[0].input;
    expect(secondPage.ExclusiveStartKey).toStrictEqual({ k: { S: '1' } });
  });

  it('skips stored items that are missing fields', async () => {
    mockReadings(
      [{ station: { S: 'kenilworth' }, timestamp: { N: '5' } }, item('kenilworth', 4, 0.8)],
      [],
    );

    await target.handler(sqsEvent({ id: 'm1', body: readingMessage('kenilworth') }));

    expect(putBody('stations/kenilworth/status.json')).toMatchObject({ depth: 0.8 });
  });

  it('ignores messages for unknown stations and messages that are not JSON', async () => {
    const response = await target.handler(
      sqsEvent(
        { id: 'm1', body: readingMessage('elsewhere') },
        { id: 'm2', body: 'not json' },
      ),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(dynamoDbMock).toHaveReceivedCommandTimes(QueryCommand, 0);
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  it('publishes nothing for a station without readings', async () => {
    mockReadings([], []);

    const response = await target.handler(
      sqsEvent({ id: 'm1', body: readingMessage('kenilworth') }),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(s3Mock).toHaveReceivedCommandTimes(PutObjectCommand, 0);
  });

  it('reports only the failed station\'s messages for retry', async () => {
    process.env.STATIONS = JSON.stringify([
      KENILWORTH,
      { id: 'warwick', measureId: '2626-level-stage-i-15_min-mASD' },
    ]);
    dynamoDbMock.on(QueryCommand).callsFake(async (input) => {
      if (input.ExpressionAttributeValues[':station'].S === 'warwick') {
        throw new Error('throttled');
      }
      return { Items: [item('kenilworth', 1, 0.8)] };
    });

    const response = await target.handler(
      sqsEvent(
        { id: 'k1', body: readingMessage('kenilworth') },
        { id: 'w1', body: readingMessage('warwick') },
        { id: 'w2', body: readingMessage('warwick') },
      ),
    );

    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'w1' }, { itemIdentifier: 'w2' }],
    });
    expect(putBody('stations/kenilworth/status.json')).toBeDefined();
  });

  it('leaves the ford state out for a station without a ford', async () => {
    process.env.STATIONS = JSON.stringify([
      { id: 'warwick', measureId: '2626-level-stage-i-15_min-mASD' },
    ]);
    mockReadings([item('warwick', 1577891700000, 0.8)], []);

    await target.handler(sqsEvent({ id: 'm1', body: readingMessage('warwick') }));

    expect(putBody('stations/warwick/status.json')).not.toHaveProperty('state');
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    await expect(
      target.handler(sqsEvent(), { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ batchItemFailures: [] });
  });
});
