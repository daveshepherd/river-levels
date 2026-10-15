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
import { ITableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Architecture, Tracing } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';
import { ApiPublisherFunction } from './api-publisher-function';
import { ApiPublisherRole } from './api-publisher.role';
import {
  StationConfig,
  STATIONS,
  validateStations,
} from '../storage-stack/stations';

export interface ApiStackProps extends StackProps {
  /** The readings table the publisher reads from. */
  readingsTable: ITableV2;
  /** The topic that announces each new reading. */
  notificationsTopic: ITopic;
  /** Where the publisher's alarms are sent. No alarms are created when omitted. */
  alertsTopic?: ITopic;
  /** The stations to publish. Defaults to STATIONS in stations.ts. */
  stations?: StationConfig[];
  setDestroyPolicyToAllResources?: boolean;
}

/**
 * Publishes each station's status and chart as JSON files in S3, regenerated
 * whenever new readings arrive. These replace the original flood-readings
 * service's /status and /chart API.
 */
export class ApiStack extends Stack {
  public readonly apiBucket: Bucket;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);
    const destroy = props.setDestroyPolicyToAllResources ?? false;

    this.apiBucket = new Bucket(this, 'api-bucket', {
      autoDeleteObjects: destroy,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      lifecycleRules: [{ noncurrentVersionExpiration: Duration.days(14) }],
      removalPolicy: destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      versioned: true,
    });

    // New-reading notifications are queued so a burst of readings, such as a
    // crawler backfill, is handled in one batch instead of one at a time.
    const deadLetterQueue = new Queue(this, 'api-publisher-dead-letter-queue', {
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
    });
    const queue = new Queue(this, 'api-publisher-queue', {
      deadLetterQueue: { queue: deadLetterQueue, maxReceiveCount: 5 },
      enforceSSL: true,
      // At least 6 times the function timeout, as AWS recommends for SQS event sources
      visibilityTimeout: Duration.minutes(6),
    });
    props.notificationsTopic.addSubscription(
      new SqsSubscription(queue, { rawMessageDelivery: true }),
    );

    const role = new ApiPublisherRole(this, 'api-publisher-role', {
      apiBucketArn: this.apiBucket.bucketArn,
      dynamoDbTableArn: props.readingsTable.tableArn,
    });
    const publisher = new ApiPublisherFunction(this, 'api-publisher-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        API_BUCKET: this.apiBucket.bucketName,
        DYNAMODB_READINGS_TABLE: props.readingsTable.tableName,
        STATIONS: JSON.stringify(validateStations(props.stations ?? STATIONS)),
      },
      logGroup: new LogGroup(this, 'api-publisher-log-group', {
        retention: RetentionDays.ONE_YEAR,
      }),
      memorySize: 256,
      role,
      timeout: Duration.seconds(60),
      tracing: Tracing.ACTIVE,
    });
    publisher.addEventSource(
      new SqsEventSource(queue, {
        batchSize: 100,
        maxBatchingWindow: Duration.seconds(60),
        reportBatchItemFailures: true,
      }),
    );

    if (props.alertsTopic) {
      const alarm = new Alarm(this, 'api-publisher-dead-letters', {
        alarmDescription:
          'New-reading notifications failed to publish after 5 attempts. They are in the API publisher dead-letter queue.',
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
    new CfnOutput(this, 'ApiBucket', { value: this.apiBucket.bucketName });
  }
}
