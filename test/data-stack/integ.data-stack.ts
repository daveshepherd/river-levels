import 'source-map-support/register';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Stack, Tags } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { DataStack } from '../../src/data-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// MRSC tables need a fixed region, and their replicas must be in the same
// region set
const stackUnderTest = new DataStack(app, 'IntegrationTestDataStack', {
  env: { region: 'eu-west-2' },
  replicaRegions: ['eu-west-1', 'eu-central-1'],
  setDestroyPolicyToAllResources: true,
});
Tags.of(stackUnderTest).add('endor:ManagedBy', 'cdk');
Tags.of(stackUnderTest).add('endor:Stage', 'development');

const integ = new IntegTest(app, 'DataTest', {
  testCases: [stackUnderTest],
  assertionStack: new Stack(app, 'DataTestAssertions', {
    env: { region: 'eu-west-2' },
  }),
});

// A reading written in one region, then read back strongly consistently
const item = {
  station: { S: 'integ-test' },
  timestamp: { N: '1718374500000' },
  reading_depth: { N: '0.694' },
  origin: { S: 'eu-west-2' },
};
integ.assertions
  .awsApiCall('DynamoDB', 'putItem', {
    TableName: stackUnderTest.readingsTable.tableName,
    Item: item,
    ConditionExpression: 'attribute_not_exists(#timestamp)',
    ExpressionAttributeNames: { '#timestamp': 'timestamp' },
  })
  .next(
    integ.assertions
      .awsApiCall('DynamoDB', 'getItem', {
        TableName: stackUnderTest.readingsTable.tableName,
        Key: { station: item.station, timestamp: item.timestamp },
        ConsistentRead: true,
      })
      .expect(ExpectedResult.objectLike({ Item: item })),
  );
