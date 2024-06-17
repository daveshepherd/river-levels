import { SNSClient, PublishBatchCommand } from '@aws-sdk/client-sns';
import { DynamoDBStreamEvent } from 'aws-lambda';
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
  it('should fail if unable to publish to SNS', async () => {
    const testEvent: DynamoDBStreamEvent = {
      Records: [
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
    snsClientMock.on(PublishBatchCommand).rejects('some error');

    await expect(target.handler(testEvent)).rejects.toThrow('some error');
  });
});
