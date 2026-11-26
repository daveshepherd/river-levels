import { Duration } from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import {
  Architecture,
  FunctionUrl,
  FunctionUrlAuthType,
  HttpMethod,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { PushSubscriptionsFunction } from './push-subscriptions-function';
import { PushSubscriptionsRole } from './push-subscriptions.role';

export interface PushSubscriptionsApiProps {
  /** The push-subscriptions table. */
  table: ITableV2;
  /** The website origins allowed to call the API (CORS). */
  allowedOrigins: string[];
  /** Where the alarm is sent. No alarm is created when omitted. */
  alertsTopic?: ITopic;
}

/**
 * The web push subscription API: a Lambda function URL that CloudFront serves
 * at /push/subscriptions.
 */
export class PushSubscriptionsApi extends Construct {
  public readonly functionUrl: FunctionUrl;

  constructor(scope: Construct, id: string, props: PushSubscriptionsApiProps) {
    super(scope, id);

    const role = new PushSubscriptionsRole(this, 'role', {
      subscriptionsTableArn: props.table.tableArn,
    });
    const fn = new PushSubscriptionsFunction(this, 'lambda', {
      architecture: Architecture.ARM_64,
      environment: { SUBSCRIPTIONS_TABLE: props.table.tableName },
      logGroup: new LogGroup(this, 'log-group', {
        retention: RetentionDays.ONE_YEAR,
      }),
      memorySize: 256,
      // The URL is public, so this caps what a flood of requests can run up.
      // Subscribing is rare; a busy moment gets throttled (429) and retried.
      reservedConcurrentExecutions: 2,
      role,
      timeout: Duration.seconds(10),
      tracing: Tracing.ACTIVE,
    });

    // No IAM auth: browsers call it through CloudFront without credentials.
    // Origin access control would need them to sign each request body.
    this.functionUrl = new FunctionUrl(this, 'url', {
      authType: FunctionUrlAuthType.NONE,
      cors: {
        allowedHeaders: ['content-type'],
        allowedMethods: [HttpMethod.POST, HttpMethod.DELETE],
        allowedOrigins: props.allowedOrigins,
        maxAge: Duration.days(1),
      },
      function: fn,
    });

    if (props.alertsTopic) {
      const alarm = new Alarm(this, 'errors', {
        alarmDescription:
          'The push subscription API failed to store or remove subscriptions. Browsers got a 502.',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 1,
        metric: fn.metricErrors({
          period: Duration.minutes(5),
          statistic: 'Sum',
        }),
        threshold: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
      const action = new SnsAction(props.alertsTopic);
      alarm.addAlarmAction(action);
      alarm.addOkAction(action);
    }
  }
}
