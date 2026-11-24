import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StorageStack, StorageStackProps } from '../../src/storage-stack';

function synth(props: Partial<StorageStackProps> = {}) {
  const app = new App();
  const stack = new StorageStack(app, 'StorageStack', {
    env: { account: '123456789012', region: 'eu-west-1' },
    readingsTableName: 'readings',
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('StorageStack', () => {
  test('that default configuration is correct', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs26.x',
      Environment: {
        Variables: {
          DYNAMODB_READINGS_TABLE: 'readings',
          READINGS_ORIGIN: 'eu-west-1',
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
    template.hasResourceProperties('AWS::IAM::Role', {
      Description: Match.anyValue(),
      Path: '/service-role/',
      ManagedPolicyArns: [Match.anyValue(), Match.anyValue()],
    });
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: Match.anyValue(),
      Path: '/service-policy/',
    });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BisectBatchOnFunctionError: true,
      DestinationConfig: {
        OnFailure: { Destination: Match.anyValue() },
      },
      Enabled: Match.absent(),
      FunctionResponseTypes: ['ReportBatchItemFailures'],
      MaximumRetryAttempts: 5,
      StartingPosition: 'LATEST',
    });
    template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'rate(10 minutes)',
      State: 'ENABLED',
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      MessageRetentionPeriod: 1209600,
    });
    template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'river-levels-notifications',
      KmsMasterKeyId: Match.anyValue(),
    });
  });

  test('that it uses the multi-region table instead of creating one', () => {
    synth().template.resourceCountIs('AWS::DynamoDB::GlobalTable', 0);
  });

  test('that the crawler can only query and create readings', () => {
    synth().template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Grant access to the river levels table',
      PolicyDocument: {
        Statement: [
          {
            Action: ['dynamodb:PutItem', 'dynamodb:Query'],
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
    const { template } = synth();

    template.hasResourceProperties('Custom::AWS', {
      Create: Match.stringLikeRegexp('describeTable'),
    });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      EventSourceArn: { 'Fn::GetAtt': [Match.stringLikeRegexp('readingsstreamlookup'), 'Table.LatestStreamArn'] },
    });
  });

  test('that the SNS publisher only publishes readings this region wrote', () => {
    synth().template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      FilterCriteria: {
        Filters: [
          { Pattern: JSON.stringify({ dynamodb: { NewImage: { origin: { S: ['eu-west-1'] } } } }) },
        ],
      },
    });
  });

  test('that everything is destroyed if setDestroyPolicyToAllResources is set', () => {
    const { template } = synth({ setDestroyPolicyToAllResources: true });

    for (const resource of Object.values(template.toJSON().Resources) as Array<{ DeletionPolicy?: string }>) {
      expect(resource.DeletionPolicy ?? 'Delete').toBe('Delete');
    }
  });

  test('that the crawler is given the configured stations', () => {
    const stations = [
      { id: 'kenilworth', measureId: '2627-level-stage-i-15_min-mASD' },
      { id: 'warwick', measureId: '2626-level-stage-i-15_min-mASD', maxDepthRiseMetres: 1 },
    ];

    synth({ stations }).template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ STATIONS: JSON.stringify(stations) }),
      },
    });
  });

  test('that an invalid station list fails the synth', () => {
    expect(() => synth({ stations: [] })).toThrow('At least one station must be configured');
  });

  test('that the crawler can run at an offset past each 10 minutes', () => {
    synth({ scheduleOffsetMinutes: 3 }).template.hasResourceProperties('AWS::Events::Rule', {
      ScheduleExpression: 'cron(3/10 * * * ? *)',
    });
  });

  test('that the notifications topic can have a fixed name', () => {
    synth({ notificationsTopicName: 'river-levels-notifications' }).template.hasResourceProperties(
      'AWS::SNS::Topic',
      { TopicName: 'river-levels-notifications' },
    );
  });
});
