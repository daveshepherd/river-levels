import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Stack, Tags } from 'aws-cdk-lib';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { ApplyDestroyPolicyAspect } from '../../src/destroy-policy';
import { NotificationsStack } from '../../src/notifications-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Stand-in for the API stack's station-status topic
const fixtures = new Stack(app, 'IntegrationTestNotificationsFixtures');
const statusTopic = new Topic(fixtures, 'station-status', { enforceSSL: true });
Aspects.of(fixtures).add(new ApplyDestroyPolicyAspect());

// Log mode: the whole pipeline runs, but nothing is posted to X
const stackUnderTest = new NotificationsStack(app, 'IntegrationTestNotificationsStack', {
  mode: 'log',
  setDestroyPolicyToAllResources: true,
  stations: [
    {
      id: 'kenilworth',
      measureId: '2627-level-stage-i-15_min-mASD',
      ford: {
        floodedAboveMetres: 1.23,
        impassableAboveMetres: 1.4,
        website: 'https://kenilworthford.com',
      },
    },
  ],
  statusTopic,
});
for (const stack of [fixtures, stackUnderTest]) {
  Tags.of(stack).add('endor:ManagedBy', 'cdk');
  Tags.of(stack).add('endor:Stage', 'development');
}

const integ = new IntegTest(app, 'NotificationsTest', {
  testCases: [stackUnderTest],
  regions: [stackUnderTest.region],
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

// The first status is recorded without posting, then a change is claimed
publishStatus('clear')
  .next(expectRecordedState('clear', '0'))
  .next(publishStatus('flooded'))
  .next(expectRecordedState('flooded', Match.stringLikeRegexp('^[1-9][0-9]+$')));

NagSuppressions.addStackSuppressions(stackUnderTest, [
  {
    appliesTo: [
      'Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
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
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestNotificationsStack/x-notifier-dead-letter-queue/Resource',
  [
    {
      id: 'AwsSolutions-SQS3',
      reason:
        'this queue is the dead-letter queue for the X notifier queue, so it does not need a DLQ of its own',
    },
  ],
);
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestNotificationsStack/x-credentials/Resource',
  [
    {
      id: 'AwsSolutions-SMG4',
      reason:
        'X credentials are issued by X and set by hand; Secrets Manager cannot rotate them',
    },
  ],
);
