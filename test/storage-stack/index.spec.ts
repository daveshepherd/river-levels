import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../../src/storage-stack';

describe('StorageStack', () => {
  test('that default configuration is correct', () => {
    const app = new App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
    });

    const template = Template.fromStack(storageStack);

    template.hasResource('AWS::DynamoDB::GlobalTable', {
      DeletionPolicy: 'Retain',
    });
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        {
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-2',
        },
      ],
      AttributeDefinitions: [
        { AttributeName: 'station', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'N' },
      ],
      KeySchema: [
        { AttributeName: 'station', KeyType: 'HASH' },
        { AttributeName: 'timestamp', KeyType: 'RANGE' },
      ],
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    });

    template.hasResource('AWS::Lambda::Function', {});
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs24.x',
      Environment: {
        Variables: {
          DYNAMODB_READINGS_TABLE: storageStack.resolve(
            storageStack.riverLevelsTableName,
          ),
          STATIONS: JSON.stringify([
            {
              id: 'kenilworth',
              measureId: '2627-level-stage-i-15_min-mASD',
              ford: {
                floodedAboveMetres: 1.23,
                impassableAboveMetres: 1.4,
                website: 'https://kenilworthford.com',
              },
            },
          ]),
        },
      },
    });
    template.hasResource('AWS::IAM::Role', {});
    template.hasResourceProperties('AWS::IAM::Role', {
      Description: Match.anyValue(),
      Path: '/service-role/',
      ManagedPolicyArns: [Match.anyValue(), Match.anyValue()],
    });
    template.hasResource('AWS::IAM::ManagedPolicy', {});
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: Match.anyValue(),
      Path: '/service-policy/',
    });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BisectBatchOnFunctionError: true,
      DestinationConfig: {
        OnFailure: { Destination: Match.anyValue() },
      },
      FunctionResponseTypes: ['ReportBatchItemFailures'],
      MaximumRetryAttempts: 5,
      StartingPosition: 'LATEST',
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 1209600,
    });
    template.hasResource('AWS::SNS::Topic', {});
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'river-levels-notifications',
      KmsMasterKeyId: Match.anyValue(),
    });
  });
  test('that a replica is created if specified', () => {
    const app = new App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      replicaRegions: ['eu-west-1'],
    });

    const template = Template.fromStack(storageStack);

    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        {
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-1',
        },
        {
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-2',
        },
      ],
    });
  });
  test('that multiple replicas are created if specified', () => {
    const app = new App();

    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      replicaRegions: ['eu-west-1', 'us-west-1'],
    });

    const template = Template.fromStack(storageStack);

    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      Replicas: [
        {
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-1',
        },
        {
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'us-west-1',
        },
        {
          DeletionProtectionEnabled: true,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-2',
        },
      ],
    });
  });
  test('that storage is destroyed if setDestroyPolicyToAllResources is set', () => {
    const app = new App();

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
        {
          DeletionProtectionEnabled: false,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-1',
        },
        {
          DeletionProtectionEnabled: false,
          PointInTimeRecoverySpecification: {
            PointInTimeRecoveryEnabled: true,
          },
          Region: 'eu-west-2',
        },
      ],
    });
  });

  test('that the crawler is given the configured stations', () => {
    const app = new App();
    const stations = [
      { id: 'kenilworth', measureId: '2627-level-stage-i-15_min-mASD' },
      { id: 'warwick', measureId: '2626-level-stage-i-15_min-mASD', maxDepthRiseMetres: 1 },
    ];
    const storageStack = new StorageStack(app, 'StorageStack', {
      env: { region: 'eu-west-2' },
      stations,
    });

    Template.fromStack(storageStack).hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ STATIONS: JSON.stringify(stations) }),
      },
    });
  });

  test('that an invalid station list fails the synth', () => {
    const app = new App();
    expect(
      () =>
        new StorageStack(app, 'StorageStack', {
          env: { region: 'eu-west-2' },
          stations: [],
        }),
    ).toThrow('At least one station must be configured');
  });

  describe('on the multi-region readings table', () => {
    function regional(props: Partial<ConstructorParameters<typeof StorageStack>[2]> = {}) {
      const app = new App();
      const stack = new StorageStack(app, 'RegionalStorageStack', {
        env: { account: '123456789012', region: 'eu-west-1' },
        readingsTableName: 'readings',
        ...props,
      });
      return { stack, template: Template.fromStack(stack) };
    }

    test('that it uses the table instead of creating one', () => {
      const { template } = regional();

      template.resourceCountIs('AWS::DynamoDB::GlobalTable', 0);
      template.hasResourceProperties('AWS::Lambda::Function', {
        Environment: {
          Variables: Match.objectLike({
            DYNAMODB_READINGS_TABLE: 'readings',
            READINGS_ORIGIN: 'eu-west-1',
          }),
        },
      });
    });

    test('that the crawler can create readings with a conditional put', () => {
      regional().template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        Description: 'Grant access to the river levels table',
        PolicyDocument: {
          Statement: [
            {
              Action: ['dynamodb:PutItem', 'dynamodb:Query', 'dynamodb:UpdateItem'],
              Effect: 'Allow',
              Resource: {
                'Fn::Join': ['', Match.arrayWith([':dynamodb:eu-west-1:123456789012:table/readings'])],
              },
            },
          ],
        },
      });
    });

    test("that the SNS publisher reads the replica's stream, looked up by name", () => {
      const { template } = regional();

      template.hasResourceProperties('Custom::AWS', {
        Create: Match.stringLikeRegexp('describeTable'),
      });
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        EventSourceArn: { 'Fn::GetAtt': [Match.stringLikeRegexp('readingsstreamlookup'), 'Table.LatestStreamArn'] },
      });
    });

    test('that the SNS publisher only publishes readings this region wrote', () => {
      regional().template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        FilterCriteria: {
          Filters: [
            { Pattern: JSON.stringify({ dynamodb: { NewImage: { origin: { S: ['eu-west-1'] } } } }) },
          ],
        },
      });
    });
  });

  test('that a stack that is not live neither crawls nor publishes', () => {
    const app = new App();
    const template = Template.fromStack(
      new StorageStack(app, 'StorageStack', { env: { region: 'eu-west-2' }, live: false }),
    );

    template.hasResourceProperties('AWS::Events::Rule', { State: 'DISABLED' });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', { Enabled: false });
  });

  test('that a live stack leaves the stream mapping enabled by default', () => {
    const app = new App();
    const template = Template.fromStack(new StorageStack(app, 'StorageStack', { env: { region: 'eu-west-2' } }));

    template.hasResourceProperties('AWS::Events::Rule', { State: 'ENABLED' });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', { Enabled: Match.absent() });
  });

  test('that the crawler can run at an offset past each 10 minutes', () => {
    const app = new App();
    const template = Template.fromStack(
      new StorageStack(app, 'StorageStack', { env: { region: 'eu-west-2' }, scheduleOffsetMinutes: 3 }),
    );

    template.hasResourceProperties('AWS::Events::Rule', { ScheduleExpression: 'cron(3/10 * * * ? *)' });
  });
});
