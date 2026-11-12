import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Stack, Tags } from 'aws-cdk-lib';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DataStack } from '../../src/data-stack';
import { StorageStack } from '../../src/storage-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// The multi-region readings table, as the RiverLevelsData stack creates it
const data = new DataStack(app, 'IntegrationTestRegionalStorageData', {
  crossRegionReferences: true,
  env: { region: 'eu-west-2' },
  replicaRegions: ['eu-west-1', 'eu-central-1'],
  setDestroyPolicyToAllResources: true,
});

// A regional storage stack in one of the other regions, live, so the test can
// check what it writes and publishes
const stackUnderTest = new StorageStack(app, 'IntegrationTestRegionalStorageStack', {
  crossRegionReferences: true,
  env: { region: 'eu-west-1' },
  readingsTableName: data.readingsTable.tableName,
  setDestroyPolicyToAllResources: true,
});
const testDLQ = new Queue(stackUnderTest, 'test-dlq', { enforceSSL: true });
const testQueue = new Queue(stackUnderTest, 'test-queue', {
  deadLetterQueue: { queue: testDLQ, maxReceiveCount: 5 },
  enforceSSL: true,
});
stackUnderTest.riverLevelsNotificationsTopic.addSubscription(
  new SqsSubscription(testQueue, { rawMessageDelivery: true }),
);
for (const stack of [data, stackUnderTest]) {
  Tags.of(stack).add('endor:ManagedBy', 'cdk');
  Tags.of(stack).add('endor:Stage', 'development');
}

const integ = new IntegTest(app, 'RegionalStorageTest', {
  testCases: [stackUnderTest],
  allowDestroy: ['AWS::IAM::Policy'],
  assertionStack: new Stack(app, 'RegionalStorageTestAssertions', {
    // The table name comes from the eu-west-2 data stack
    crossRegionReferences: true,
    env: { region: 'eu-west-1' },
  }),
  cdkCommandOptions: { destroy: { args: { force: true } } },
});

// A real crawl writes the latest reading, tagged with this region
integ.assertions
  .invokeFunction({
    functionName: stackUnderTest.crawlerFunctionName,
    payload: JSON.stringify({ readingsLimit: 1 }),
  })
  .next(
    integ.assertions
      .awsApiCall('DynamoDB', 'Query', {
        ConsistentRead: true,
        ExpressionAttributeValues: { ':station': { S: 'kenilworth' } },
        KeyConditionExpression: 'station = :station',
        Limit: 1,
        ScanIndexForward: false,
        TableName: stackUnderTest.riverLevelsTableName,
      })
      .expect(
        ExpectedResult.objectLike({
          Count: 1,
          Items: [Match.objectLike({ origin: { S: 'eu-west-1' } })],
        }),
      )
      .waitForAssertions({
        totalTimeout: Duration.minutes(5),
        interval: Duration.seconds(15),
        backoffRate: 3,
      }),
  );

// A reading this region wrote is published; one another region wrote isn't
const now = Date.now();
const ours = (now - 1).toString();
const theirs = now.toString();
for (const [timestamp, origin] of [[ours, 'eu-west-1'], [theirs, 'eu-central-1']]) {
  integ.assertions.awsApiCall('DynamoDB', 'PutItem', {
    Item: {
      station: { S: 'test_station' },
      timestamp: { N: timestamp },
      reading_depth: { N: '1.1' },
      origin: { S: origin },
    },
    TableName: stackUnderTest.riverLevelsTableName,
  });
}
integ.assertions
  .awsApiCall('SQS', 'ReceiveMessage', {
    MaxNumberOfMessages: 10,
    QueueUrl: testQueue.queueUrl,
    WaitTimeSeconds: 20,
  })
  .expect(
    ExpectedResult.objectLike({
      Messages: Match.arrayWith([
        Match.objectLike({
          Body: `{"reading_depth":1.1,"station":"test_station","timestamp":${ours}}`,
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
    ],
    id: 'AwsSolutions-IAM4',
    reason: 'it is acceptable to use build in iam policies for basic lambda runtime',
  },
  {
    appliesTo: ['Resource::*'],
    id: 'AwsSolutions-IAM5',
    reason: 'the lambda tracing option creates a wildcard policy',
  },
  {
    id: 'AwsSolutions-L1',
    reason: 'the AwsCustomResource and cross-region reference providers are managed by CDK and pin their own runtime',
  },
]);
for (const queue of ['sns-publisher-failure-queue', 'crawler-dead-letter-queue']) {
  NagSuppressions.addResourceSuppressionsByPath(
    stackUnderTest,
    `/IntegrationTestRegionalStorageStack/${queue}/Resource`,
    [
      {
        id: 'AwsSolutions-SQS3',
        reason: 'this queue is itself a dead-letter or on-failure destination',
      },
    ],
  );
}
NagSuppressions.addStackSuppressions(data, [
  {
    id: 'AwsSolutions-IAM4',
    reason: 'the cross-region export writer is managed by CDK',
  },
  {
    id: 'AwsSolutions-IAM5',
    reason: 'the cross-region export writer is managed by CDK',
  },
  {
    id: 'AwsSolutions-L1',
    reason: 'the cross-region export writer is managed by CDK and pins its own runtime',
  },
]);
