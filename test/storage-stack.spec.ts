import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../src/storage-stack';

describe('StorageStack', () => {
  test('that default configuration is correct', () => {
    const app = new cdk.App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
    });

    const template = Template.fromStack(storageStack);

    console.log(JSON.stringify(template));

    template.hasResource('AWS::DynamoDB::GlobalTable', {
      DeletionPolicy: 'Retain',
    });
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [{ Region: 'eu-west-2' }],
      AttributeDefinitions: [
        { AttributeName: 'station', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'station', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
    });
  });
  test('that a replica is created if specified', () => {
    const app = new cdk.App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      replicaRegions: ['eu-west-1'],
    });

    const template = Template.fromStack(storageStack);

    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        { DeletionProtectionEnabled: true, Region: 'eu-west-1' },
        { DeletionProtectionEnabled: true, Region: 'eu-west-2' },
      ],
    });
  });
  test('that multiple replicas are created if specified', () => {
    const app = new cdk.App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      replicaRegions: ['eu-west-1', 'us-west-1'],
    });

    const template = Template.fromStack(storageStack);

    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        { DeletionProtectionEnabled: true, Region: 'eu-west-1' },
        { DeletionProtectionEnabled: true, Region: 'us-west-1' },
        { DeletionProtectionEnabled: true, Region: 'eu-west-2' },
      ],
    });
  });
  test('that storage is destroyed if setDestroyPolicyToAllResources is set', () => {
    const app = new cdk.App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      replicaRegions: ['eu-west-1'],
      setDestroyPolicyToAllResources: true,
    });

    const template = Template.fromStack(storageStack);

    template.hasResource('AWS::DynamoDB::GlobalTable', {
      DeletionPolicy: 'Delete',
    });
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        { DeletionProtectionEnabled: false, Region: 'eu-west-1' },
        { DeletionProtectionEnabled: false, Region: 'eu-west-2' },
      ],
    });
  });
});