import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Stack, Tags } from 'aws-cdk-lib';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { DataStack } from '../../src/data-stack';
import { ApplyDestroyPolicyAspect } from '../../src/destroy-policy';
import { NotificationsStack } from '../../src/notifications-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// The multi-region notifier-state table, as the RiverLevelsData stack creates it
const data = new DataStack(app, 'IntegrationTestRegionalNotificationsData', {
  crossRegionReferences: true,
  env: { region: 'eu-west-2' },
  replicaRegions: ['eu-west-1', 'eu-central-1'],
  setDestroyPolicyToAllResources: true,
});

// Stand-in for a regional API stack's station-status topic
const fixtures = new Stack(app, 'IntegrationTestRegionalNotificationsFixtures', {
  env: { region: 'eu-west-1' },
});
const statusTopic = new Topic(fixtures, 'station-status', { enforceSSL: true });
Aspects.of(fixtures).add(new ApplyDestroyPolicyAspect());

// A regional notifier against the table's eu-west-1 replica, in log mode, so
// nothing is posted to X
const stackUnderTest = new NotificationsStack(app, 'IntegrationTestRegionalNotificationsStack', {
  crossRegionReferences: true,
  env: { region: 'eu-west-1' },
  mode: 'log',
  setDestroyPolicyToAllResources: true,
  stateTableName: data.notifierStateTable.tableName,
  stations: [{ id: 'kenilworth', measureId: '2627-level-stage-i-15_min-mASD' }],
  statusTopic,
});
// Receives the announcements, so the test can check what was announced
const announcementsDLQ = new Queue(stackUnderTest, 'test-dlq', { enforceSSL: true });
const announcementsQueue = new Queue(stackUnderTest, 'test-queue', {
  deadLetterQueue: { queue: announcementsDLQ, maxReceiveCount: 5 },
  enforceSSL: true,
});
stackUnderTest.announcementsTopic.addSubscription(
  new SqsSubscription(announcementsQueue, { rawMessageDelivery: true }),
);
for (const stack of [data, fixtures, stackUnderTest]) {
  Tags.of(stack).add('endor:ManagedBy', 'cdk');
  Tags.of(stack).add('endor:Stage', 'development');
}

const integ = new IntegTest(app, 'RegionalNotificationsTest', {
  testCases: [stackUnderTest],
  assertionStack: new Stack(app, 'RegionalNotificationsTestAssertions', {
    // The table name comes from the eu-west-2 data stack
    crossRegionReferences: true,
    env: { region: 'eu-west-1' },
  }),
  cdkCommandOptions: { destroy: { args: { force: true } } },
});

function publishStatus(state: string) {
  return integ.assertions.awsApiCall('@aws-sdk/client-sns', 'PublishCommand', {
    Message: JSON.stringify({
      station: 'kenilworth',
      depth: state === 'clear' ? 0.8 : 1.3,
      direction: 'rising',
      rate: 'moderate',
      state,
      lastUpdate: new Date().toISOString(),
    }),
    TopicArn: statusTopic.topicArn,
  });
}

function expectRecordedState(state: string, postedAt: unknown) {
  return integ.assertions
    .awsApiCall('@aws-sdk/client-dynamodb', 'GetItemCommand', {
      ConsistentRead: true,
      Key: { station: { S: 'kenilworth' } },
      TableName: stackUnderTest.stateTable.tableName,
    })
    .expect(
      ExpectedResult.objectLike({
        Item: { state: { S: state }, postedAt: { N: postedAt } },
      }),
    )
    .waitForAssertions({
      totalTimeout: Duration.minutes(5),
      interval: Duration.seconds(15),
      backoffRate: 2,
    });
}

// The first status is recorded without announcing, then a change is claimed,
// both through the conditional writes on the multi-region table, and
// announced once
publishStatus('clear')
  .next(expectRecordedState('clear', '0'))
  .next(publishStatus('flooded'))
  .next(expectRecordedState('flooded', Match.stringLikeRegexp('^[1-9][0-9]+$')))
  .next(
    integ.assertions
      .awsApiCall('SQS', 'ReceiveMessage', {
        MaxNumberOfMessages: 10,
        QueueUrl: announcementsQueue.queueUrl,
        WaitTimeSeconds: 20,
      })
      .expect(
        ExpectedResult.objectLike({
          Messages: [
            Match.objectLike({
              Body: Match.serializedJson(
                Match.objectLike({
                  station: 'kenilworth',
                  transition: 'risingFlooded',
                  state: 'flooded',
                  previousState: 'clear',
                }),
              ),
            }),
          ],
        }),
      )
      .waitForAssertions({
        totalTimeout: Duration.minutes(5),
        interval: Duration.seconds(15),
        backoffRate: 2,
      }),
  );

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
    reason: 'the cross-region reference provider is managed by CDK and pins its own runtime',
  },
]);
for (const queue of ['ford-announcer-dead-letter-queue', 'x-notifier-dead-letter-queue', 'test-dlq']) {
  NagSuppressions.addResourceSuppressionsByPath(
    stackUnderTest,
    `/IntegrationTestRegionalNotificationsStack/${queue}/Resource`,
    [
      {
        id: 'AwsSolutions-SQS3',
        reason: 'this queue is itself a dead-letter queue, so it does not need one of its own',
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
