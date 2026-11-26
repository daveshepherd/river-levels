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
    pushSubscriptionsTableName: 'push-subscriptions',
    stateTableName: 'notifier-state',
    statusTopic: new Topic(fixtures, 'status'),
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('NotificationsStack', () => {
  test('that the announcer is given the state table and the announcements topic', () => {
    const { stack, template } = synth();

    template.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'src/notifications-stack/ford-announcer.lambda.ts',
      Runtime: 'nodejs26.x',
      Timeout: 30,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: {
          ANNOUNCEMENTS_TOPIC_ARN: stack.resolve(stack.announcementsTopic.topicArn),
          STATE_TABLE: 'notifier-state',
        },
      },
    });
  });

  test('that the X notifier is given its mode, stations and credentials parameter', () => {
    const { template } = synth({
      mode: 'post',
      stations: [{ id: 'a', measureId: 'm' }],
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'src/notifications-stack/x-notifier.lambda.ts',
      Runtime: 'nodejs26.x',
      Timeout: 30,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: {
          MODE: 'post',
          STATIONS: JSON.stringify([{ id: 'a', measureId: 'm' }]),
          X_CREDENTIALS_PARAMETER: '/river-levels/x-credentials',
        },
      },
    });
  });

  test('that announcements go to an encrypted topic', () => {
    synth().template.hasResourceProperties('AWS::SNS::Topic', {
      DisplayName: 'river-levels-ford-announcements',
      KmsMasterKeyId: Match.anyValue(),
    });
  });

  test('that statuses feed the announcer and announcements feed the X notifier and web push deliverer', () => {
    const { stack, template } = synth();

    const subscriptions = Object.values(template.findResources('AWS::SNS::Subscription'));
    expect(subscriptions).toHaveLength(3);
    for (const subscription of subscriptions) {
      expect(subscription.Properties).toMatchObject({ Protocol: 'sqs', RawMessageDelivery: true });
    }
    expect(subscriptions.map((sub) => sub.Properties.TopicArn)).toContainEqual(
      stack.resolve(stack.announcementsTopic.topicArn),
    );
    template.resourcePropertiesCountIs(
      'AWS::Lambda::EventSourceMapping',
      { BatchSize: 10, FunctionResponseTypes: ['ReportBatchItemFailures'] },
      3,
    );
  });

  test('that it uses the multi-region state table instead of creating one', () => {
    const { stack, template } = synth();

    template.resourceCountIs('AWS::DynamoDB::GlobalTable', 0);
    expect(JSON.stringify(stack.resolve(stack.stateTable.tableArn))).toContain(
      ':table/notifier-state',
    );
  });

  test('that the X credentials come from an SSM parameter, not a secret', () => {
    const { template } = synth();

    template.resourceCountIs('AWS::SecretsManager::Secret', 0);
    template.resourceCountIs('AWS::SSM::Parameter', 0);
  });

  test('that each queue has a dead-letter queue', () => {
    const { template } = synth();

    template.resourcePropertiesCountIs(
      'AWS::SQS::Queue',
      {
        VisibilityTimeout: 180,
        RedrivePolicy: Match.objectLike({ maxReceiveCount: 5 }),
      },
      3,
    );
  });

  test('that the announcer can only use the state table and the announcements topic', () => {
    const { stack, template } = synth();

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Read and claim the last state announced per station, and publish announcements',
      PolicyDocument: {
        Statement: [
          {
            Action: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            Effect: 'Allow',
            Resource: stack.resolve(stack.stateTable.tableArn),
          },
          {
            Action: 'sns:Publish',
            Effect: 'Allow',
            Resource: stack.resolve(stack.announcementsTopic.topicArn),
          },
        ],
      },
    });
  });

  test('that the X notifier can only read its credentials parameter', () => {
    synth().template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Read the X credentials, to post announcements',
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

  test('that the web push deliverer is given the subscriptions table, stations and VAPID keys parameter', () => {
    synth().template.hasResourceProperties('AWS::Lambda::Function', {
      Description: 'src/notifications-stack/web-push-deliverer.lambda.ts',
      Architectures: ['arm64'],
      Timeout: 30,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: Match.objectLike({
          STATIONS: Match.anyValue(),
          SUBSCRIPTIONS_TABLE: 'push-subscriptions',
          VAPID_KEYS_PARAMETER: '/river-levels/vapid-keys',
        }),
      },
    });
  });

  test('that the web push deliverer can only read and prune subscriptions and read the VAPID keys', () => {
    synth().template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description:
        'Read web push subscriptions and remove gone ones, and read the VAPID keys, to send announcements',
      PolicyDocument: {
        Statement: [
          {
            Action: ['dynamodb:Scan', 'dynamodb:DeleteItem'],
            Effect: 'Allow',
            Resource: {
              'Fn::Join': ['', Match.arrayWith([':table/push-subscriptions'])],
            },
          },
          {
            Action: 'ssm:GetParameter',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': ['', Match.arrayWith([':parameter/river-levels/vapid-keys'])],
            },
          },
        ],
      },
    });
  });

  test('that the VAPID keys parameter name is a stack output and can be changed', () => {
    synth().template.hasOutput('VapidKeysParameterName', {
      Value: '/river-levels/vapid-keys',
    });
    const { stack, template } = synth({ vapidKeysParameterName: '/other/vapid' });
    expect(stack.vapidKeysParameterName).toBe('/other/vapid');
    template.hasOutput('VapidKeysParameterName', { Value: '/other/vapid' });
  });

  test('that each dead-letter queue has an alarm that notifies the alerts topic', () => {
    const { template } = synth();

    template.resourceCountIs('AWS::CloudWatch::Alarm', 3);
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
