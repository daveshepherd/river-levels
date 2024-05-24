import 'source-map-support/register';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { AwsSolutionsChecks, NagSuppressions } from 'cdk-nag';
import { StorageStack } from '../src/storage-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const stackUnderTest = new StorageStack(app, 'IntegrationTestStorageStack', {
  setDestroyPolicyToAllResources: true,
});

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
    logRetention: RetentionDays.ONE_WEEK,
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
    id: 'AwsSolutions-IAM4',
    reason:
      'it is acceptable to use build in iam policies for basic lambda runtime',
  },
]);
