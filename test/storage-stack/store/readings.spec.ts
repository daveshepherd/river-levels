import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const dynamoDBClientMock = mockClient(DynamoDBClient);

import * as target from '../../../src/storage-stack/store/readings';

beforeEach(() => {
  dynamoDBClientMock.reset();
});

describe('readings store', () => {
  it('test the database record is returned successfully', async () => {
    const dynamoDbQueryResponse = {
      Items: [
        {
          station: { S: 'kenilworth' },
          timestamp: { N: '1577836800000' },
          reading_depth: { N: '0.8' },
        },
      ],
    };
    dynamoDBClientMock.on(QueryCommand).resolvesOnce(dynamoDbQueryResponse);

    process.env.DYNAMODB_READINGS_TABLE = 'my-dynamodb-table';

    const actualReading = await target.getLatestReading('kenilworth');

    const expectedReading = {
      date: new Date('2020-01-01T00:00:00Z'),
      depth: 0.8,
    };
    expect(actualReading).toEqual(expectedReading);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);

    const expectedRequest = {
      ExpressionAttributeValues: {
        ':station': { S: 'kenilworth' },
      },
      KeyConditionExpression: 'station = :station',
      Limit: 1,
      ScanIndexForward: false,
      TableName: 'my-dynamodb-table',
    };
    const actualRequest =
      dynamoDBClientMock.commandCalls(QueryCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });

  it('test null is returned if there are no records', async () => {
    const dynamoDbQueryResponse = { Items: [], Count: 0, ScannedCount: 0 };
    dynamoDBClientMock.on(QueryCommand).resolvesOnce(dynamoDbQueryResponse);

    process.env.DYNAMODB_READINGS_TABLE = 'my-dynamodb-table';

    const actualReading = await target.getLatestReading('kenilworth');

    expect(actualReading).toEqual(null);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(QueryCommand, 1);

    const expectedRequest = {
      ExpressionAttributeValues: {
        ':station': { S: 'kenilworth' },
      },
      KeyConditionExpression: 'station = :station',
      Limit: 1,
      ScanIndexForward: false,
      TableName: 'my-dynamodb-table',
    };
    const actualRequest =
      dynamoDBClientMock.commandCalls(QueryCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });

  it('test records are saved when a list is provided', async () => {
    process.env.DYNAMODB_READINGS_TABLE = 'my-dynamodb-table';

    const readingsToSave = [
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ];

    await target.updateReadings('kenilworth', readingsToSave);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateItemCommand, 3);

    const actualRequest =
      dynamoDBClientMock.commandCalls(UpdateItemCommand)[0].firstArg.input;

    expect(actualRequest.Key.station).toEqual({ S: 'kenilworth' });
    expect(
      [1577879100000, 1577878200000, 1577877300000].includes(
        parseFloat(actualRequest.Key.timestamp.N),
      ),
    ).toBeTruthy();
  });

  it('returns null when the stored item is missing fields', async () => {
    dynamoDBClientMock.on(QueryCommand).resolvesOnce({
      Items: [{ station: { S: 'kenilworth' }, timestamp: { N: '1577836800000' } }],
    });

    await expect(target.getLatestReading('kenilworth')).resolves.toBeNull();
  });

  it('rethrows when the latest reading query fails', async () => {
    dynamoDBClientMock.on(QueryCommand).rejects(new Error('query failed'));

    await expect(target.getLatestReading('kenilworth')).rejects.toThrow('query failed');
  });

  it('rethrows when a reading update fails', async () => {
    dynamoDBClientMock.on(UpdateItemCommand).rejects(new Error('update failed'));

    await expect(
      target.updateReadings('kenilworth', [{ date: new Date('2020-01-01T11:45:00Z'), depth: 0.83 }]),
    ).rejects.toThrow('update failed');
  });

  it('makes no calls when there are no readings', async () => {
    await target.updateReadings('kenilworth', []);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateItemCommand, 0);
  });

  it(`writes no more than ${target.MAX_CONCURRENT_WRITES} readings at once`, async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    dynamoDBClientMock.on(UpdateItemCommand).callsFake(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight--;
      return {};
    });
    const readings = Array.from({ length: 25 }, (_, i) => ({
      date: new Date(1577836800000 + i * 900000),
      depth: 0.8,
    }));

    await target.updateReadings('kenilworth', readings);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(UpdateItemCommand, 25);
    expect(maxInFlight).toBe(target.MAX_CONCURRENT_WRITES);
  });
});
