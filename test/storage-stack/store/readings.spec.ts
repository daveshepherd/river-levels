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

    const actualReading = await target.getLatestReading();

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

    const actualReading = await target.getLatestReading();

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

    await target.updateReadings(readingsToSave);

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
});
