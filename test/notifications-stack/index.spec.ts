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
      Runtime: 'nodejs24.x',
      Timeout: 30,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: {
          MODE: 'post',
          STATE_TABLE: stack.resolve(stack.stateTable.tableName),
          STATIONS: JSON.stringify([{ id: 'a', measureId: 'm' }]),
          X_CREDENTIALS_SECRET_ARN: stack.resolve(stack.credentialsSecret.secretArn),
        },
      },
    });
  });

  test('that the state table and credentials secret are retained', () => {
    const { template } = synth();

    template.hasResource('AWS::DynamoDB::GlobalTable', {
      DeletionPolicy: 'Retain',
      Properties: Match.objectLike({
        KeySchema: [{ AttributeName: 'station', KeyType: 'HASH' }],
      }),
    });
    template.hasResource('AWS::SecretsManager::Secret', {
      DeletionPolicy: 'Retain',
      Properties: Match.objectLike({
        GenerateSecretString: {
          GenerateStringKey: 'unused',
          SecretStringTemplate: JSON.stringify({
            appKey: '',
            appSecret: '',
            accessToken: '',
            accessSecret: '',
          }),
        },
      }),
    });
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

  test('that the notifier can only use its table and secret', () => {
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
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
            Resource: stack.resolve(stack.credentialsSecret.secretArn),
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
          X_CREDENTIALS_SECRET_ARN: stack.resolve(stack.credentialsSecret.secretArn),
        },
      },
    });
    template.resourceCountIs('Custom::Trigger', 1);
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Read the X credentials',
      PolicyDocument: {
        Statement: [
          {
            Action: 'secretsmanager:GetSecretValue',
            Effect: 'Allow',
            Resource: stack.resolve(stack.credentialsSecret.secretArn),
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

  test('that the secret ARN is a stack output', () => {
    synth().template.hasOutput('XCredentialsSecretArn', {
      Value: { Ref: Match.stringLikeRegexp('xcredentials') },
    });
  });
});
