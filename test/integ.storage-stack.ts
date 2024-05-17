import 'source-map-support/register';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
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
  .awsApiCall('DynamoDB', 'putItem', {
    Item: {
      station: {
        S: 'station_name',
      },
      timestamp: {
        N: '1',
      },
    },
    TableName: stackUnderTest.riverLevelsTableName,
  })
  .next(
    integ.assertions
      .awsApiCall('DynamoDB', 'getItem', {
        TableName: stackUnderTest.riverLevelsTableName,
        Key: {
          station: {
            S: 'station_name',
          },
          timestamp: {
            N: '1',
          },
        },
      })
      .expect(
        ExpectedResult.objectLike({
          Item: {
            station: {
              S: 'station_name',
            },
            timestamp: {
              N: '1',
            },
          },
        }),
      ),
  );
