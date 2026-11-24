import { Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  IAlarmAction,
  Metric,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface StorageAlarmsProps {
  crawler: IFunction;
  crawlerDeadLetterQueue: IQueue;
  snsPublisher: IFunction;
  snsPublisherFailureQueue: IQueue;
  /**
   * Email address subscribed to the alerts topic. The subscription must be
   * confirmed from the email AWS sends before alerts are delivered.
   */
  alertEmail?: string;
}

/**
 * Alarms for the crawler and notification pipeline, all sent to one alerts
 * topic. Each alarm also notifies when it returns to OK.
 */
export class StorageAlarms extends Construct {
  public readonly alertsTopic: ITopic;

  constructor(scope: Construct, id: string, props: StorageAlarmsProps) {
    super(scope, id);

    // Not encrypted: CloudWatch can't publish to a topic encrypted with the
    // AWS-managed SNS key, and alarm notifications contain no reading data.
    const alertsTopic = new Topic(this, 'alerts', {
      displayName: 'river-levels-alerts',
      enforceSSL: true,
    });
    if (props.alertEmail) {
      alertsTopic.addSubscription(new EmailSubscription(props.alertEmail));
    }
    this.alertsTopic = alertsTopic;
    const action = new SnsAction(alertsTopic);

    // The crawler runs every 10 minutes, and Lambda retries a failed async
    // invocation twice, so one bad run can report up to 3 errors. Only alarm
    // when every 10-minute window for 30 minutes has errors.
    this.addAlarm(action, 'crawler-errors', {
      alarmDescription:
        'The crawler has failed in every run for 30 minutes, so no new readings are being stored.',
      metric: props.crawler.metricErrors({ period: Duration.minutes(10) }),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator:
        ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.addAlarm(action, 'crawler-not-running', {
      alarmDescription:
        'The crawler has not been invoked for 30 minutes. Check the crawler-cron EventBridge rule.',
      metric: props.crawler.metricInvocations({
        period: Duration.minutes(30),
      }),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: TreatMissingData.BREACHING,
    });

    this.addAlarm(action, 'crawler-dead-letters', {
      alarmDescription:
        'EventBridge could not invoke the crawler after retries. Messages are in the crawler dead-letter queue.',
      metric: props.crawlerDeadLetterQueue.metricApproximateNumberOfMessagesVisible(
        { period: Duration.minutes(5), statistic: 'Maximum' },
      ),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.addAlarm(action, 'sns-publisher-iterator-age', {
      alarmDescription:
        'The SNS publisher is more than 15 minutes behind the DynamoDB stream, so notifications are delayed or stuck.',
      metric: new Metric({
        namespace: 'AWS/Lambda',
        metricName: 'IteratorAge',
        dimensionsMap: { FunctionName: props.snsPublisher.functionName },
        period: Duration.minutes(5),
        statistic: 'Maximum',
      }),
      threshold: Duration.minutes(15).toMilliseconds(),
      evaluationPeriods: 2,
      comparisonOperator:
        ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.addAlarm(action, 'sns-publisher-failures', {
      alarmDescription:
        'Stream batches failed to publish after all retries. Their stream positions are in sns-publisher-failure-queue.',
      metric:
        props.snsPublisherFailureQueue.metricApproximateNumberOfMessagesVisible(
          { period: Duration.minutes(5), statistic: 'Maximum' },
        ),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });
  }

  private addAlarm(
    action: IAlarmAction,
    id: string,
    props: ConstructorParameters<typeof Alarm>[2],
  ) {
    const alarm = new Alarm(this, id, props);
    alarm.addAlarmAction(action);
    alarm.addOkAction(action);
    return alarm;
  }
}
