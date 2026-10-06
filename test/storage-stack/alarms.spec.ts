import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StorageStack } from '../../src/storage-stack';

function synth(alertEmail?: string) {
  const app = new App();
  const stack = new StorageStack(app, 'StorageStack', {
    env: { region: 'eu-west-2' },
    alertEmail,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('StorageAlarms', () => {
  test('that every alarm notifies the alerts topic on alarm and on recovery', () => {
    const { stack, template } = synth();
    const topicRef = stack.resolve(stack.alertsTopic.topicArn);

    const alarms = template.findResources('AWS::CloudWatch::Alarm');
    expect(Object.keys(alarms)).toHaveLength(5);
    for (const alarm of Object.values(alarms)) {
      expect(alarm.Properties.AlarmActions).toStrictEqual([topicRef]);
      expect(alarm.Properties.OKActions).toStrictEqual([topicRef]);
    }
  });

  test('that the crawler errors alarm needs 30 minutes of failures', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'Errors',
      Namespace: 'AWS/Lambda',
      Period: 600,
      EvaluationPeriods: 3,
      Threshold: 1,
      ComparisonOperator: 'GreaterThanOrEqualToThreshold',
      TreatMissingData: 'notBreaching',
    });
  });

  test('that the crawler alarms when it has not run for 30 minutes', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'Invocations',
      Period: 1800,
      Threshold: 1,
      ComparisonOperator: 'LessThanThreshold',
      TreatMissingData: 'breaching',
    });
  });

  test('that the publisher alarms when it falls 15 minutes behind the stream', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'IteratorAge',
      Statistic: 'Maximum',
      Threshold: 900000,
      EvaluationPeriods: 2,
    });
  });

  test('that both failure queues have an alarm', () => {
    const { template } = synth();
    const queueAlarms = Object.values(
      template.findResources('AWS::CloudWatch::Alarm', {
        Properties: {
          MetricName: 'ApproximateNumberOfMessagesVisible',
        },
      }),
    );
    expect(queueAlarms).toHaveLength(2);
  });

  test('that the email is subscribed when given', () => {
    const { template } = synth('alerts@example.com');
    template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'email',
      Endpoint: 'alerts@example.com',
    });
  });

  test('that there is no email subscription when no email is given', () => {
    const { template } = synth();
    template.resourcePropertiesCountIs(
      'AWS::SNS::Subscription',
      { Protocol: 'email' },
      0,
    );
  });

  test('that the crawler schedule sends failed invocations to a dead-letter queue', () => {
    const { template } = synth();
    template.hasResourceProperties('AWS::Events::Rule', {
      Targets: [
        Match.objectLike({
          DeadLetterConfig: { Arn: Match.anyValue() },
          RetryPolicy: { MaximumRetryAttempts: 3 },
        }),
      ],
    });
  });
});
