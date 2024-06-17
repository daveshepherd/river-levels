import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Tags } from 'aws-cdk-lib';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { StorageStack } from '../../src/storage-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const stackUnderTest = new StorageStack(app, 'IntegrationTestStorageStack', {
  setDestroyPolicyToAllResources: true,
});
const testDLQ = new Queue(stackUnderTest, 'test-dlq', {
  enforceSSL: true,
});
const testQueue = new Queue(stackUnderTest, 'test-queue', {
  deadLetterQueue: {
    queue: testDLQ,
    maxReceiveCount: 5,
  },
  enforceSSL: true,
});
stackUnderTest.riverLevelsNotificationsTopic.addSubscription(
  new SqsSubscription(testQueue),
);
Tags.of(stackUnderTest).add('endor:ManagedBy', 'cdk');
Tags.of(stackUnderTest).add('endor:Stage', 'development');

const integ = new IntegTest(app, 'DataStoreTest', {
  testCases: [stackUnderTest],
  cdkCommandOptions: {
    destroy: {
      args: {
        force: true,
      },
    },
  },
  regions: [stackUnderTest.region],
});

integ.assertions
  .invokeFunction({
    functionName: stackUnderTest.crawlerFunctionName,
    payload: JSON.stringify({
      readingsLimit: 1,
    }),
  })
  .next(
    integ.assertions
      .awsApiCall('DynamoDB', 'Query', {
        ExpressionAttributeValues: {
          ':station': { S: 'kenilworth' },
        },
        KeyConditionExpression: 'station = :station',
        Limit: 1,
        ScanIndexForward: false,
        TableName: stackUnderTest.riverLevelsTableName,
      })
      .expect(
        ExpectedResult.objectLike({
          Count: 1,
        }),
      )
      .waitForAssertions({
        totalTimeout: Duration.minutes(5),
        interval: Duration.seconds(15),
        backoffRate: 3,
      }),
  );

const testTimestamp = new Date().getTime().toString();
integ.assertions.awsApiCall('@aws-sdk/client-dynamodb', 'PutItemCommand', {
  Item: {
    station: { S: 'test_station' },
    timestamp: { N: testTimestamp },
    reading_depth: { N: '1.1' },
  },
  TableName: stackUnderTest.riverLevelsTableName,
});

integ.assertions
  .awsApiCall('@aws-sdk/client-sqs', 'ReceiveMessageCommand', {
    QueueUrl: testQueue.queueUrl,
  })
  .expect(
    ExpectedResult.objectLike({
      Messages: Match.arrayWith([
        Match.objectLike({
          Body: Match.serializedJson(
            Match.objectLike({
              Message: `{"reading_depth":1.1,"station":"test_station","timestamp":${testTimestamp}}`,
            }),
          ),
        }),
      ]),
    }),
  )
  .waitForAssertions({
    totalTimeout: Duration.minutes(5),
    interval: Duration.seconds(15),
    backoffRate: 3,
  });

NagSuppressions.addStackSuppressions(stackUnderTest, [
  {
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      'Policy::arn:<AWS::Partition>:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy',
    ],
    id: 'AwsSolutions-IAM4',
    reason:
      'it is acceptable to use build in iam policies for basic lambda runtime',
  },
  {
    appliesTo: ['Resource::*'],
    id: 'AwsSolutions-IAM5',
    reason: 'the lambda tracing option creates a wildcard policy',
  },
]);
