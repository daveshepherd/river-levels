import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Topic } from 'aws-cdk-lib/aws-sns';
import {
  NotificationsStack,
  NotificationsStackProps,
} from '../../src/notifications-stack';

function synth(props: Partial<NotificationsStackProps> = {}) {
  const app = new App();
  const fixtures = new Stack(app, 'Fixtures', { env: { region: 'eu-west-2' } });
  const stack = new NotificationsStack(app, 'NotificationsStack', {
    alertsTopic: new Topic(fixtures, 'alerts'),
    env: { region: 'eu-west-2' },
    mode: 'log',
    statusTopic: new Topic(fixtures, 'status'),
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('NotificationsStack', () => {
  test('that the notifier is given its mode, table, secret and stations', () => {
    const { stack, template } = synth({
      mode: 'post',
      stations: [{ id: 'a', measureId: 'm' }],
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs26.x',
      Timeout: 30,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: {
          MODE: 'post',
          STATE_TABLE: stack.resolve(stack.stateTable.tableName),
          STATIONS: JSON.stringify([{ id: 'a', measureId: 'm' }]),
          X_CREDENTIALS_PARAMETER: '/river-levels/x-credentials',
        },
      },
    });
  });

  test('that the state table is retained', () => {
    const { template } = synth();

    template.hasResource('AWS::DynamoDB::GlobalTable', {
      DeletionPolicy: 'Retain',
      Properties: Match.objectLike({
        KeySchema: [{ AttributeName: 'station', KeyType: 'HASH' }],
      }),
    });
  });

  test('that an existing state table can be used instead of creating one', () => {
    const { stack, template } = synth({ stateTableName: 'notifier-state' });

    template.resourceCountIs('AWS::DynamoDB::GlobalTable', 0);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({ STATE_TABLE: 'notifier-state' }),
      },
    });
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: stack.resolve(stack.stateTable.tableArn),
          },
        ]),
      },
    });
    expect(JSON.stringify(stack.resolve(stack.stateTable.tableArn))).toContain(
      ':table/notifier-state',
    );
  });

  test('that the X credentials come from an SSM parameter, not a secret', () => {
    const { template } = synth();

    template.resourceCountIs('AWS::SecretsManager::Secret', 0);
    template.resourceCountIs('AWS::SSM::Parameter', 0);
  });

  test('that station statuses are queued with raw delivery and a dead-letter queue', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'sqs',
      RawMessageDelivery: true,
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 180,
      RedrivePolicy: Match.objectLike({ maxReceiveCount: 5 }),
    });
    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 10,
      FunctionResponseTypes: ['ReportBatchItemFailures'],
    });
  });

  test('that the notifier can only use its table and credentials parameter', () => {
    const { stack, template } = synth();

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: stack.resolve(stack.stateTable.tableArn),
          },
          {
            Action: 'ssm:GetParameter',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': ['', Match.arrayWith([':parameter/river-levels/x-credentials'])],
            },
          },
        ],
      },
    });
  });

  test('that the dead-letter queue alarm notifies the alerts topic', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'ApproximateNumberOfMessagesVisible',
      AlarmActions: [Match.anyValue()],
      OKActions: [Match.anyValue()],
    });
  });

  test('that the smoke test runs on deploy with its own role', () => {
    const { stack, template } = synth({ smokeTest: true });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'src/notifications-stack/x-smoke-test.lambda.ts',
      Environment: {
        Variables: {
          X_CREDENTIALS_PARAMETER: '/river-levels/x-credentials',
        },
      },
    });
    template.resourceCountIs('Custom::Trigger', 1);
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Read the X credentials',
      PolicyDocument: {
        Statement: [
          {
            Action: 'ssm:GetParameter',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': ['', Match.arrayWith([':parameter/river-levels/x-credentials'])],
            },
          },
        ],
      },
    });
  });

  test('that there is no smoke test by default', () => {
    const { template } = synth();

    template.resourceCountIs('Custom::Trigger', 0);
    template.resourcePropertiesCountIs(
      'AWS::Lambda::Function',
      { Description: 'src/notifications-stack/x-smoke-test.lambda.ts' },
      0,
    );
  });

  test('that there is no alarm without an alerts topic', () => {
    synth({ alertsTopic: undefined }).template.resourceCountIs(
      'AWS::CloudWatch::Alarm',
      0,
    );
  });

  test('that everything is destroyed if setDestroyPolicyToAllResources is set', () => {
    const { template } = synth({ setDestroyPolicyToAllResources: true });

    for (const resource of Object.values(template.toJSON().Resources) as Array<{ DeletionPolicy?: string }>) {
      expect(resource.DeletionPolicy ?? 'Delete').toBe('Delete');
    }
  });

  test('that the parameter name is a stack output', () => {
    synth().template.hasOutput('XCredentialsParameterName', {
      Value: '/river-levels/x-credentials',
    });
  });

  test('that the parameter name can be changed', () => {
    const { stack, template } = synth({ credentialsParameterName: '/other/x' });

    expect(stack.credentialsParameterName).toBe('/other/x');
    template.hasOutput('XCredentialsParameterName', { Value: '/other/x' });
  });
});
