import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
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

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 1);
    const expectedRequest = {
      Message: JSON.stringify({
        reading_depth: 0.694,
        station: 'kenilworth',
        timestamp: 1718374500000,
      }),
      TopicArn: 'my-sns-topic',
    };
    const actualRequest =
      snsClientMock.commandCalls(PublishCommand)[0].firstArg.input;
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

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 2);
    const expectedRequest1 = {
      Message: JSON.stringify({
        reading_depth: 0.694,
        station: 'kenilworth',
        timestamp: 1718374500000,
      }),
      TopicArn: 'my-sns-topic',
    };
    const actualRequest1 =
      snsClientMock.commandCalls(PublishCommand)[0].firstArg.input;
    expect(actualRequest1).toStrictEqual(expectedRequest1);
    const expectedRequest2 = {
      Message: JSON.stringify({
        reading_depth: 0.705,
        station: 'kenilworth',
        timestamp: 1718377700000,
      }),
      TopicArn: 'my-sns-topic',
    };
    const actualRequest2 =
      snsClientMock.commandCalls(PublishCommand)[1].firstArg.input;
    expect(actualRequest2).toStrictEqual(expectedRequest2);
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

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 0);
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

    expect(snsClientMock).toHaveReceivedCommandTimes(PublishCommand, 1);
    const expectedRequest = {
      Message: JSON.stringify({
        reading_depth: 0.705,
        station: 'kenilworth',
        timestamp: 1718377700000,
      }),
      TopicArn: 'my-sns-topic',
    };
    const actualRequest =
      snsClientMock.commandCalls(PublishCommand)[0].firstArg.input;
    expect(actualRequest).toStrictEqual(expectedRequest);
  });
});
