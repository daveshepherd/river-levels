import 'source-map-support/register';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration, Tags } from 'aws-cdk-lib';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { StorageStack } from '../src/storage-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const stackUnderTest = new StorageStack(app, 'IntegrationTestStorageStack', {
  setDestroyPolicyToAllResources: true,
});
Tags.of(stackUnderTest).add('ManagedBy', 'CDK');
Tags.of(stackUnderTest).add('Stage', 'integ');

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
