import {
  Aspects,
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Tracing } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';
import type { NotifierMode } from '../stage';
import { XNotifierFunction } from './x-notifier-function';
import { XNotifierRole } from './x-notifier.role';
import {
  StationConfig,
  STATIONS,
  validateStations,
} from '../storage-stack/stations';

export interface NotificationsStackProps extends StackProps {
  /** The topic each station's status is published to, once per batch. */
  statusTopic: ITopic;
  /** Whether the X notifier posts or only logs. */
  mode: NotifierMode;
  /** Where the notifier's alarms are sent. No alarms are created when omitted. */
  alertsTopic?: ITopic;
  /** The stations, for each ford's website link. Defaults to STATIONS in stations.ts. */
  stations?: StationConfig[];
  setDestroyPolicyToAllResources?: boolean;
}

/**
 * Announces ford state changes. The X notifier is the first channel; others
 * can subscribe to the station-status topic the same way.
 */
export class NotificationsStack extends Stack {
  public readonly stateTable: TableV2;
  public readonly credentialsSecret: Secret;

  constructor(scope: Construct, id: string, props: NotificationsStackProps) {
    super(scope, id, props);
    const destroy = props.setDestroyPolicyToAllResources ?? false;
    const retain = destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN;

    // The last state posted for each station, for the cooldown and to
    // recognise a change
    this.stateTable = new TableV2(this, 'x-notifier-state', {
      partitionKey: { name: 'station', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: retain,
    });

    // Filled in by hand with the X app and account credentials; CDK only
    // creates it, with empty values, and never overwrites what's set.
    this.credentialsSecret = new Secret(this, 'x-credentials', {
      description:
        'X (Twitter) OAuth 1.0a credentials for the river levels notifier: appKey, appSecret, accessToken, accessSecret',
      generateSecretString: {
        generateStringKey: 'unused',
        secretStringTemplate: JSON.stringify({
          appKey: '',
          appSecret: '',
          accessToken: '',
          accessSecret: '',
        }),
      },
      removalPolicy: retain,
    });

    const deadLetterQueue = new Queue(this, 'x-notifier-dead-letter-queue', {
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
    });
    const queue = new Queue(this, 'x-notifier-queue', {
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 5 },
      enforceSSL: true,
      // At least 6 times the function timeout, as AWS recommends for SQS event sources
      visibilityTimeout: Duration.minutes(3),
    });
    props.statusTopic.addSubscription(
      new SqsSubscription(queue, { rawMessageDelivery: true }),
    );

    const notifier = new XNotifierFunction(this, 'x-notifier-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        MODE: props.mode,
        STATE_TABLE: this.stateTable.tableName,
        STATIONS: JSON.stringify(validateStations(props.stations ?? STATIONS)),
        X_CREDENTIALS_SECRET_ARN: this.credentialsSecret.secretArn,
      },
      logGroup: new LogGroup(this, 'x-notifier-log-group', {
        retention: RetentionDays.ONE_YEAR,
      }),
      memorySize: 256,
      role: new XNotifierRole(this, 'x-notifier-role', {
        credentialsSecretArn: this.credentialsSecret.secretArn,
        stateTableArn: this.stateTable.tableArn,
      }),
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
    });
    notifier.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );

    if (props.alertsTopic) {
      const alarm = new Alarm(this, 'x-notifier-dead-letters', {
        alarmDescription:
          'Station statuses failed to notify after 5 attempts, so a ford state change may not have been posted. They are in the X notifier dead-letter queue.',
        comparisonOperator:
          ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        evaluationPeriods: 1,
        metric: deadLetterQueue.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(5),
          statistic: 'Maximum',
        }),
        threshold: 1,
        treatMissingData: TreatMissingData.NOT_BREACHING,
      });
      const action = new SnsAction(props.alertsTopic);
      alarm.addAlarmAction(action);
      alarm.addOkAction(action);
    }

    if (destroy) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'XCredentialsSecretArn', {
      description: 'Set this secret to the X credentials before switching the notifier to post',
      value: this.credentialsSecret.secretArn,
    });
  }
}
