import { SNSClient, PublishBatchCommand } from '@aws-sdk/client-sns';
import type { DynamoDBStreamEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';

const snsClientMock = mockClient(SNSClient);

import * as target from '../../src/storage-stack/sns-publisher.lambda';

beforeEach(() => {
  snsClientMock.reset();
});

describe('sns-publisher', () => {
  it('should publish message to SNS topic when insert received from stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.694',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718374500000',
              },
            },
          },
        },
      ],
    };

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 1);
    const expectedRequest = {
      PublishBatchRequestEntries: [
        {
          Id: 'kenilworth1718374500000',
          Message: JSON.stringify({
            reading_depth: 0.694,
            station: 'kenilworth',
            timestamp: 1718374500000,
          }),
        },
      ],
      TopicArn: 'my-sns-topic',
    };
    const actualRequest =
      snsClientMock.commandCalls(PublishBatchCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });
  it('should publish multiple messages to SNS topic when inserts received from stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.694',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718374500000',
              },
            },
          },
        },
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.705',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718377700000',
              },
            },
          },
        },
      ],
    };

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 1);
    const expectedRequest = {
      PublishBatchRequestEntries: [
        {
          Id: 'kenilworth1718374500000',
          Message: JSON.stringify({
            reading_depth: 0.694,
            station: 'kenilworth',
            timestamp: 1718374500000,
          }),
        },
        {
          Id: 'kenilworth1718377700000',
          Message: JSON.stringify({
            reading_depth: 0.705,
            station: 'kenilworth',
            timestamp: 1718377700000,
          }),
        },
      ],
      TopicArn: 'my-sns-topic',
    };
    const actualRequest =
      snsClientMock.commandCalls(PublishBatchCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });
  it('should not publish message to SNS topic when non-insert actions are received from stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'MODIFY',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.694',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718374500000',
              },
            },
          },
        },
      ],
    };

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 0);
  });
  it('should not publish message to SNS topic when reading_depth in not in messages received from the stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718374500000',
              },
            },
          },
        },
      ],
    };

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 0);
  });
  it('should not publish message to SNS topic when station in not in messages received from the stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.694',
              },
              timestamp: {
                N: '1718374500000',
              },
            },
          },
        },
      ],
    };

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 0);
  });
  it('should not publish message to SNS topic when timestamp in not in messages received from the stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              station: {
                S: 'kenilworth',
              },
              reading_depth: {
                N: '0.694',
              },
            },
          },
        },
      ],
    };

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 0);
  });
  it('should only publish INSERT messages to SNS topic when multiple messages received from stream', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'MODIFY',
        },
        {
          eventName: 'INSERT',
          dynamodb: {
            NewImage: {
              reading_depth: {
                N: '0.705',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718377700000',
              },
            },
          },
        },
      ],
    };

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';

    await target.handler(testEvent);

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 1);
    const expectedRequest = {
      PublishBatchRequestEntries: [
        {
          Id: 'kenilworth1718377700000',
          Message: JSON.stringify({
            reading_depth: 0.705,
            station: 'kenilworth',
            timestamp: 1718377700000,
          }),
        },
      ],
      TopicArn: 'my-sns-topic',
    };
    const actualRequest =
      snsClientMock.commandCalls(PublishBatchCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });
  it('should report the first record as failed if unable to publish to SNS', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
        {
          eventName: 'INSERT',
          dynamodb: {
            SequenceNumber: '100',
            NewImage: {
              reading_depth: {
                N: '0.705',
              },
              station: {
                S: 'kenilworth',
              },
              timestamp: {
                N: '1718377700000',
              },
            },
          },
        },
      ],
    };

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';
    snsClientMock.on(PublishBatchCommand).rejects('some error');

    await expect(target.handler(testEvent)).resolves.toStrictEqual({
      batchItemFailures: [{ itemIdentifier: '100' }],
    });
  });
  it('should publish in batches of no more than 10 messages', async () => {
    const testEvent = buildInsertEvent(25);

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';
    snsClientMock.on(PublishBatchCommand).resolves({ Failed: [] });

    await expect(target.handler(testEvent)).resolves.toStrictEqual({
      batchItemFailures: [],
    });

    const calls = snsClientMock.commandCalls(PublishBatchCommand);
    expect(
      calls.map((call) => call.firstArg.input.PublishBatchRequestEntries.length),
    ).toStrictEqual([10, 10, 5]);
    expect(
      calls.flatMap((call) =>
        call.firstArg.input.PublishBatchRequestEntries.map(
          (entry: { Id: string }) => entry.Id,
        ),
      ),
    ).toStrictEqual(
      testEvent.Records.map(
        (record) =>
          `kenilworth${record.dynamodb!.NewImage!.timestamp.N}`,
      ),
    );
  });
  it('should stop and report the earliest failed entry when SNS partially fails a batch', async () => {
    const testEvent = buildInsertEvent(25);

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';
    snsClientMock
      .on(PublishBatchCommand)
      .resolvesOnce({ Failed: [] })
      .resolvesOnce({
        Failed: [
          { Id: 'kenilworth1718374500017', Code: 'InternalError', SenderFault: false },
          { Id: 'kenilworth1718374500013', Code: 'InternalError', SenderFault: false },
        ],
      });

    await expect(target.handler(testEvent)).resolves.toStrictEqual({
      batchItemFailures: [{ itemIdentifier: '113' }],
    });
    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 2);
  });
  it('should report the first record of the failing batch when a later publish errors', async () => {
    const testEvent = buildInsertEvent(25);

    process.env.SNS_TOPIC_ARN = 'my-sns-topic';
    snsClientMock
      .on(PublishBatchCommand)
      .resolvesOnce({ Failed: [] })
      .rejectsOnce('some error');

    await expect(target.handler(testEvent)).resolves.toStrictEqual({
      batchItemFailures: [{ itemIdentifier: '110' }],
    });
    expect(snsClientMock).toHaveReceivedCommandTimes(PublishBatchCommand, 2);
  });
});

function buildInsertEvent(count: number): DynamoDBStreamEvent {
  return {
    Records: Array.from({ length: count }, (_, i) => ({
      eventName: 'INSERT',
      dynamodb: {
        SequenceNumber: `${100 + i}`,
        NewImage: {
          reading_depth: { N: '0.7' },
          station: { S: 'kenilworth' },
          timestamp: { N: `${1718374500000 + i}` },
        },
      },
    })),
  };
}
