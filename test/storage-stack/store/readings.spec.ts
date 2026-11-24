import {
  ConditionalCheckFailedException,
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  ReplicatedWriteConflictException,
} from '@aws-sdk/client-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const dynamoDBClientMock = mockClient(DynamoDBClient);

import * as target from '../../../src/storage-stack/store/readings';

beforeEach(() => {
  dynamoDBClientMock.reset();
  process.env.READINGS_ORIGIN = 'eu-west-1';
  process.env.DYNAMODB_READINGS_TABLE = 'readings';
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

  it('makes no calls when there are no readings', async () => {
    await target.updateReadings('kenilworth', []);

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutItemCommand, 0);
  });

  it('refuses to write without READINGS_ORIGIN', async () => {
    delete process.env.READINGS_ORIGIN;

    await expect(
      target.updateReadings('kenilworth', [{ date: new Date('2020-01-01T11:45:00Z'), depth: 0.83 }]),
    ).rejects.toThrow('READINGS_ORIGIN must be set');
    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutItemCommand, 0);
  });

  it(`writes no more than ${target.MAX_CONCURRENT_WRITES} readings at once`, async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    dynamoDBClientMock.on(PutItemCommand).callsFake(async () => {
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

    expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutItemCommand, 25);
    expect(maxInFlight).toBe(target.MAX_CONCURRENT_WRITES);
  });

  describe('writing readings', () => {
    const reading = { date: new Date('2020-01-01T11:45:00Z'), depth: 0.83 };
    const conflict = () => new ReplicatedWriteConflictException({ message: 'conflict', $metadata: {} });

    it('creates a reading only if it is new, tagged with the region', async () => {
      dynamoDBClientMock.on(PutItemCommand).resolves({});

      await target.updateReadings('kenilworth', [reading]);

      expect(dynamoDBClientMock).toHaveReceivedCommandWith(PutItemCommand, {
        ConditionExpression: 'attribute_not_exists(#timestamp)',
        ExpressionAttributeNames: { '#timestamp': 'timestamp' },
        Item: {
          station: { S: 'kenilworth' },
          timestamp: { N: '1577879100000' },
          reading_depth: { N: '0.83' },
          origin: { S: 'eu-west-1' },
        },
        TableName: 'readings',
      });
    });

    it('skips a reading another region already wrote', async () => {
      dynamoDBClientMock.on(PutItemCommand).rejects(
        new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }),
      );

      await expect(target.updateReadings('kenilworth', [reading])).resolves.toBeUndefined();
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutItemCommand, 1);
    });

    it('retries a write that conflicts with another region', async () => {
      dynamoDBClientMock
        .on(PutItemCommand)
        .rejectsOnce(conflict())
        .rejectsOnce(new ConditionalCheckFailedException({ message: 'exists', $metadata: {} }));

      await target.updateReadings('kenilworth', [reading]);

      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(PutItemCommand, 2);
    });

    it(`gives up after ${target.MAX_CONFLICT_RETRIES} conflict retries`, async () => {
      dynamoDBClientMock.on(PutItemCommand).rejects(conflict());

      await expect(target.updateReadings('kenilworth', [reading])).rejects.toThrow('conflict');
      expect(dynamoDBClientMock).toHaveReceivedCommandTimes(
        PutItemCommand,
        target.MAX_CONFLICT_RETRIES + 1,
      );
    });

    it('rethrows other errors', async () => {
      dynamoDBClientMock.on(PutItemCommand).rejects(new Error('throttled'));

      await expect(target.updateReadings('kenilworth', [reading])).rejects.toThrow('throttled');
    });
  });
});
