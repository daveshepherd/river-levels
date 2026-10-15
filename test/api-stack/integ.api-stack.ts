import 'source-map-support/register';
import { ExpectedResult, IntegTest, Match } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Stack, Tags } from 'aws-cdk-lib';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { ApiStack } from '../../src/api-stack';
import { ApplyDestroyPolicyAspect } from '../../src/destroy-policy';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// Stand-ins for the storage stack's readings table and notifications topic
const fixtures = new Stack(app, 'IntegrationTestApiFixtures');
const readingsTable = new TableV2(fixtures, 'readings-table', {
  partitionKey: { name: 'station', type: AttributeType.STRING },
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
});
const notificationsTopic = new Topic(fixtures, 'notifications', {
  enforceSSL: true,
});
Aspects.of(fixtures).add(new ApplyDestroyPolicyAspect());

const stackUnderTest = new ApiStack(app, 'IntegrationTestApiStack', {
  notificationsTopic,
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
for (const stack of [fixtures, stackUnderTest]) {
  Tags.of(stack).add('endor:ManagedBy', 'cdk');
  Tags.of(stack).add('endor:Stage', 'development');
}

const integ = new IntegTest(app, 'ApiTest', {
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

// A reading in the table, then the notification the SNS publisher would send for it
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
          ContentType: 'application/json',
          CacheControl: 'max-age=300',
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
  )
  .next(
    integ.assertions
      .awsApiCall('@aws-sdk/client-s3', 'GetObjectCommand', {
        Bucket: stackUnderTest.apiBucket.bucketName,
        Key: 'stations/kenilworth/chart.json',
      })
      .expect(
        ExpectedResult.objectLike({
          Body: Match.serializedJson([[timestamp, 1.3]]),
        }),
      ),
  )
  // The same files through CloudFront, at the original API's paths
  .next(
    integ.assertions
      .httpApiCall(
        `https://${stackUnderTest.distribution.distributionDomainName}/status`,
        { headers: { Origin: 'https://kenilworthford.com' } },
      )
      .expect(
        ExpectedResult.objectLike({
          status: 200,
          headers: Match.objectLike({
            'access-control-allow-origin': ['*'],
            'content-type': ['application/json'],
          }),
          body: Match.objectLike({ depth: 1.3, state: 'flooded' }),
        }),
      )
      .waitForAssertions({
        totalTimeout: Duration.minutes(5),
        interval: Duration.seconds(15),
        backoffRate: 2,
      }),
  )
  .next(
    integ.assertions
      .httpApiCall(
        `https://${stackUnderTest.distribution.distributionDomainName}/chart`,
      )
      .expect(
        ExpectedResult.objectLike({
          status: 200,
          body: [[timestamp, 1.3]],
        }),
      ),
  );

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
  {
    appliesTo: ['Resource::<apibucketE65E1D51.Arn>/stations/*'],
    id: 'AwsSolutions-IAM5',
    reason:
      'the publisher writes one status and chart file per station under stations/',
  },
]);
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestApiStack/api-bucket/Resource',
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
  '/IntegrationTestApiStack/api-publisher-dead-letter-queue/Resource',
  [
    {
      id: 'AwsSolutions-SQS3',
      reason:
        'this queue is the dead-letter queue for the API publisher queue, so it does not need a DLQ of its own',
    },
  ],
);
NagSuppressions.addResourceSuppressionsByPath(
  stackUnderTest,
  '/IntegrationTestApiStack/api/distribution/Resource',
  [
    {
      id: 'AwsSolutions-CFR1',
      reason: 'the station files are public data, so there is no reason to restrict them by country',
    },
    {
      id: 'AwsSolutions-CFR2',
      reason: 'the distribution serves small, cached, read-only public files; a WAF would cost more than the rest of the stack',
    },
    {
      id: 'AwsSolutions-CFR3',
      reason: 'the distribution serves public, read-only files; access logs would add cost without a use',
    },
    {
      id: 'AwsSolutions-CFR4',
      reason: 'the default cloudfront.net certificate cannot set a minimum TLS version; the custom domain certificate will require TLS 1.2',
    },
  ],
);
