import {
  ArnFormat,
  Aspects,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  Alarm,
  ComparisonOperator,
  TreatMissingData,
} from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';
import { ITableV2, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { Architecture, Tracing, IFunction } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Trigger } from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';
import type { NotifierMode } from '../stage';
import { FordAnnouncerFunction } from './ford-announcer-function';
import { FordAnnouncerRole } from './ford-announcer.role';
import { XNotifierFunction } from './x-notifier-function';
import { XNotifierRole } from './x-notifier.role';
import { XSmokeTestFunction } from './x-smoke-test-function';
import { XSmokeTestRole } from './x-smoke-test.role';
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
  /**
   * The SSM SecureString parameter holding the X credentials, created by hand
   * (CloudFormation can't create SecureString parameters).
   * @default X_CREDENTIALS_PARAMETER_NAME
   */
  credentialsParameterName?: string;
  /**
   * Post a smoke test to X, and delete it, on deploys that change the smoke
   * test function, failing the deploy if that doesn't work. Only for a stage
   * whose credentials parameter is set, and that posts to a test account.
   */
  smokeTest?: boolean;
  /**
   * The multi-region `notifier-state` table from the DataStack, by name. Its
   * replica in this stack's region is used.
   */
  stateTableName: string;
  setDestroyPolicyToAllResources?: boolean;
}

/** Where the X credentials are kept: an SSM SecureString parameter, one per region. */
export const X_CREDENTIALS_PARAMETER_NAME = '/river-levels/x-credentials';

/**
 * Announces ford state changes and delivers them. The ford announcer decides
 * when a change is announced and publishes it once to the ford-announcements
 * topic; each channel (X first) subscribes to that topic with its own queue.
 */
export class NotificationsStack extends Stack {
  public readonly stateTable: ITableV2;
  /** Each announced ford state change, for the channels to deliver. */
  public readonly announcementsTopic: Topic;
  /** The SSM parameter the X credentials are read from. */
  public readonly credentialsParameterName: string;

  constructor(scope: Construct, id: string, props: NotificationsStackProps) {
    super(scope, id, props);
    const destroy = props.setDestroyPolicyToAllResources ?? false;

    // The last state announced for each station, for the cooldown and to
    // recognise a change. The conditional claim in posted-state.ts on this
    // multi-region table lets only one region announce each change.
    this.stateTable = TableV2.fromTableName(
      this,
      'x-notifier-state',
      props.stateTableName,
    );
    const stations = validateStations(props.stations ?? STATIONS);
    const alarmAction = props.alertsTopic
      ? new SnsAction(props.alertsTopic)
      : undefined;

    this.announcementsTopic = new Topic(this, 'ford-announcements', {
      displayName: 'river-levels-ford-announcements',
      enforceSSL: true,
      masterKey: Alias.fromAliasName(this, 'aws-managed-sns-key', 'alias/aws/sns'),
    });

    const announcer = new FordAnnouncerFunction(this, 'ford-announcer-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        ANNOUNCEMENTS_TOPIC_ARN: this.announcementsTopic.topicArn,
        STATE_TABLE: this.stateTable.tableName,
      },
      logGroup: new LogGroup(this, 'ford-announcer-log-group', {
        retention: RetentionDays.ONE_YEAR,
      }),
      memorySize: 256,
      role: new FordAnnouncerRole(this, 'ford-announcer-role', {
        announcementsTopicArn: this.announcementsTopic.topicArn,
        stateTableArn: this.stateTable.tableArn,
      }),
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
    });
    this.subscribe(
      'ford-announcer',
      props.statusTopic,
      announcer,
      'Station statuses failed to be announced after 5 attempts, so a ford state change may not have been announced on any channel. They are in the ford announcer dead-letter queue.',
      alarmAction,
    );

    // An SSM SecureString parameter, set by hand with the X app and account
    // credentials. Standard parameters are free, unlike secrets, and X's
    // credentials can't be rotated automatically, so there's nothing for
    // Secrets Manager's rotation to do.
    this.credentialsParameterName =
      props.credentialsParameterName ?? X_CREDENTIALS_PARAMETER_NAME;
    const credentialsParameterArn = this.formatArn({
      arnFormat: ArnFormat.SLASH_RESOURCE_NAME,
      resource: 'parameter',
      resourceName: this.credentialsParameterName.replace(/^\//, ''),
      service: 'ssm',
    });

    const notifier = new XNotifierFunction(this, 'x-notifier-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        MODE: props.mode,
        STATIONS: JSON.stringify(stations),
        X_CREDENTIALS_PARAMETER: this.credentialsParameterName,
      },
      logGroup: new LogGroup(this, 'x-notifier-log-group', {
        retention: RetentionDays.ONE_YEAR,
      }),
      memorySize: 256,
      role: new XNotifierRole(this, 'x-notifier-role', {
        credentialsParameterArn,
      }),
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
    });
    this.subscribe(
      'x-notifier',
      this.announcementsTopic,
      notifier,
      'Announcements failed to post to X after 5 attempts, so a ford state change may not have been posted. They are in the X notifier dead-letter queue.',
      alarmAction,
    );

    if (props.smokeTest) {
      const smokeTest = new XSmokeTestFunction(this, 'x-smoke-test-lambda', {
        architecture: Architecture.ARM_64,
        environment: {
          X_CREDENTIALS_PARAMETER: this.credentialsParameterName,
        },
        logGroup: new LogGroup(this, 'x-smoke-test-log-group', {
          retention: RetentionDays.ONE_YEAR,
        }),
        role: new XSmokeTestRole(this, 'x-smoke-test-role', {
          credentialsParameterArn,
        }),
        timeout: Duration.seconds(30),
        tracing: Tracing.ACTIVE,
      });
      // Runs only when the function's code or configuration changes. Its
      // bundle includes the X client and twitter-api-v2, so a change that
      // could affect posting runs it
      new Trigger(this, 'x-smoke-test', {
        executeAfter: [notifier],
        executeOnHandlerChange: true,
        handler: smokeTest,
        timeout: Duration.seconds(30),
      });
    }

    if (destroy) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'XCredentialsParameterName', {
      description: 'Create this SSM SecureString parameter with the X credentials before switching the notifier to post',
      value: this.credentialsParameterName,
    });
  }

  /**
   * Feeds a topic to a function through an SQS queue, with raw message
   * delivery and partial batch failures. A message that fails 5 times goes to
   * a dead-letter queue, and with an alarm action, any dead letter alarms.
   */
  private subscribe(
    id: string,
    topic: ITopic,
    handler: IFunction,
    alarmDescription: string,
    alarmAction?: SnsAction,
  ) {
    const deadLetterQueue = new Queue(this, `${id}-dead-letter-queue`, {
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
    });
    const queue = new Queue(this, `${id}-queue`, {
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 5 },
      enforceSSL: true,
      // At least 6 times the function timeout, as AWS recommends for SQS event sources
      visibilityTimeout: Duration.minutes(3),
    });
    topic.addSubscription(new SqsSubscription(queue, { rawMessageDelivery: true }));
    handler.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 10,
        reportBatchItemFailures: true,
      }),
    );
    if (alarmAction) {
      const alarm = new Alarm(this, `${id}-dead-letters`, {
        alarmDescription,
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
      alarm.addAlarmAction(alarmAction);
      alarm.addOkAction(alarmAction);
    }
  }
}
