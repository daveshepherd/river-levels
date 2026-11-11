import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { DataStack, DataStackProps } from '../../src/data-stack';

function synth(props: Partial<DataStackProps> = {}) {
  const app = new App();
  const stack = new DataStack(app, 'DataStack', {
    env: { region: 'eu-west-2' },
    replicaRegions: ['eu-west-1', 'eu-central-1'],
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('DataStack', () => {
  test('that the readings table is strongly consistent in three regions, with a stream', () => {
    synth().template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      KeySchema: [
        { AttributeName: 'station', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
      MultiRegionConsistency: 'STRONG',
      StreamSpecification: { StreamViewType: 'NEW_AND_OLD_IMAGES' },
      Replicas: [
        {
          Region: 'eu-west-1',
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
            RecoveryPeriodInDays: 35,
          },
        },
        {
          Region: 'eu-central-1',
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
            RecoveryPeriodInDays: 35,
          },
        },
        {
          Region: 'eu-west-2',
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
            RecoveryPeriodInDays: 35,
          },
        },
      ],
    });
  });

  test('that the notifier state table is strongly consistent in three regions', () => {
    synth().template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      KeySchema: [{ AttributeName: 'station', KeyType: 'HASH' }],
      MultiRegionConsistency: 'STRONG',
    });
  });

  test('that both tables are retained', () => {
    const { template } = synth();
    for (const table of Object.values(template.findResources('AWS::DynamoDB::GlobalTable'))) {
      expect(table.DeletionPolicy).toBe('Retain');
      expect(table.UpdateReplacePolicy).toBe('Retain');
    }
  });

  test('that everything is destroyed if setDestroyPolicyToAllResources is set', () => {
    const { template } = synth({ setDestroyPolicyToAllResources: true });

    for (const resource of Object.values(template.toJSON().Resources) as Array<{ DeletionPolicy?: string }>) {
      expect(resource.DeletionPolicy ?? 'Delete').toBe('Delete');
    }
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        { Region: 'eu-west-1', DeletionProtectionEnabled: false },
        { Region: 'eu-central-1', DeletionProtectionEnabled: false },
        { Region: 'eu-west-2', DeletionProtectionEnabled: false },
      ],
    });
  });

  test('that the table names are stack outputs', () => {
    const { template } = synth();
    template.hasOutput('ReadingsTableName', {});
    template.hasOutput('NotifierStateTableName', {});
  });

  test('that a region outside the EU strong consistency set is rejected', () => {
    expect(() => synth({ replicaRegions: ['eu-west-1', 'us-east-1'] })).toThrow(
      /us-east-1/,
    );
  });
});
