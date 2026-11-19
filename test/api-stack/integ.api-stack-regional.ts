import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Aws, Duration, Stack, Tags } from 'aws-cdk-lib';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { ApiStack } from '../../src/api-stack';
import { ApplyDestroyPolicyAspect } from '../../src/destroy-policy';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Stand-ins for the regional storage stack's table replica and topic
const fixtures = new Stack(app, 'IntegrationTestRegionalApiFixtures', {
  env: { region: 'eu-west-1' },
});
const readingsTable = new TableV2(fixtures, 'readings-table', {
  partitionKey: { name: 'station', type: AttributeType.STRING },
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
});
const notificationsTopic = new Topic(fixtures, 'notifications', {
  enforceSSL: true,
});
Aspects.of(fixtures).add(new ApplyDestroyPolicyAspect());

// Another region's new-reading topic, subscribed to by ARN as main.ts does
const otherRegionTopicName = 'integ-regional-api-other-notifications';
const otherRegion = new Stack(app, 'IntegrationTestRegionalApiOtherRegion', {
  env: { region: 'eu-central-1' },
});
new Topic(otherRegion, 'notifications', {
  enforceSSL: true,
  topicName: otherRegionTopicName,
});
Aspects.of(otherRegion).add(new ApplyDestroyPolicyAspect());

const stackUnderTest = new ApiStack(app, 'IntegrationTestRegionalApiStack', {
  allowCloudFrontInAccount: true,
  createDistribution: false,
  deliveryDelay: Duration.seconds(30),
  env: { region: 'eu-west-1' },
  notificationsTopic,
  otherNotificationsTopicArns: [
    `arn:${Aws.PARTITION}:sns:eu-central-1:${Aws.ACCOUNT_ID}:${otherRegionTopicName}`,
  ],
  readingsTable,
  setDestroyPolicyToAllResources: true,
  stations: [
    {
      id: 'kenilworth',
      measureId: '2627-level-stage-i-15_min-mASD',
      ford: { floodedAboveMetres: 1.23, impassableAboveMetres: 1.4 },
    },
  ],
});
// The subscription refers to the topic by ARN, so make sure it exists first.
// Deploying proves the cross-region subscription can be created.
stackUnderTest.addDependency(otherRegion);

for (const stack of [fixtures, otherRegion, stackUnderTest]) {
  Tags.of(stack).add('endor:ManagedBy', 'cdk');
  Tags.of(stack).add('endor:Stage', 'development');
}

const integ = new IntegTest(app, 'RegionalApiTest', {
  testCases: [stackUnderTest],
  assertionStack: new Stack(app, 'RegionalApiTestAssertions', {
    env: { region: 'eu-west-1' },
  }),
  cdkCommandOptions: { destroy: { args: { force: true } } },
});

// A reading in this region's table, then its notification: the file appears
// after the 30-second delivery delay
const timestamp = new Date().getTime();
integ.assertions
  .awsApiCall('@aws-sdk/client-dynamodb', 'PutItemCommand', {
    Item: {
      station: { S: 'kenilworth' },
      timestamp: { N: timestamp.toString() },
      reading_depth: { N: '1.3' },
    },
    TableName: readingsTable.tableName,
  })
  .next(
    integ.assertions.awsApiCall('@aws-sdk/client-sns', 'PublishCommand', {
      Message: JSON.stringify({
        reading_depth: 1.3,
        station: 'kenilworth',
        timestamp,
      }),
      TopicArn: notificationsTopic.topicArn,
    }),
  )
  .next(
    integ.assertions
      .awsApiCall('@aws-sdk/client-s3', 'GetObjectCommand', {
        Bucket: stackUnderTest.apiBucket.bucketName,
        Key: 'stations/kenilworth/status.json',
      })
      .expect(
        ExpectedResult.objectLike({
          Body: Match.serializedJson(
            Match.objectLike({
              depth: 1.3,
              state: 'flooded',
              lastUpdate: new Date(timestamp).toISOString(),
            }),
          ),
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
    appliesTo: ['Resource::<apibucketE65E1D51.Arn>/stations/*'],
    id: 'AwsSolutions-IAM5',
    reason: 'the publisher writes one status and chart file per station under stations/',
  },
]);
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestRegionalApiStack/api-bucket/Resource',
  [
    {
      id: 'AwsSolutions-S1',
      reason:
        'the bucket holds generated, public data, is only written by the publisher and only read by CloudFront; access logs would add cost without a use',
    },
  ],
);
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestRegionalApiStack/api-publisher-dead-letter-queue/Resource',
  [
    {
      id: 'AwsSolutions-SQS3',
      reason: 'this queue is the dead-letter queue for the API publisher queue, so it does not need a DLQ of its own',
    },
  ],
);
