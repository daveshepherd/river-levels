import {
  Aspects,
  CfnOutput,
  Duration,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  AttributeType,
  ITableV2,
  StreamViewType,
  TableV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Alias } from 'aws-cdk-lib/aws-kms';
import {
  Architecture,
  FilterCriteria,
  FilterRule,
  StartingPosition,
  Tracing,
} from 'aws-cdk-lib/aws-lambda';
import {
  DynamoEventSource,
  SqsDlq,
} from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ITopic, Topic, TracingConfig } from 'aws-cdk-lib/aws-sns';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';
import { StorageAlarms } from './alarms';
import { CrawlerFunction } from './crawler-function';
import { CrawlerRole } from './crawler.role';
import { SnsPublisherFunction } from './sns-publisher-function';
import { SnsPublisherRole } from './sns-publisher.role';
import { StationConfig, STATIONS, validateStations } from './stations';

export interface StorageStackProps extends StackProps {
  /**
   * Email address that receives alarm notifications. Optional, so local
   * synths and integ tests don't need one.
   */
  alertEmail?: string;
  replicaRegions?: Array<string>;
  /**
   * Use the multi-region (MRSC) readings table, by name, instead of creating
   * a table. The crawler then only creates readings that don't exist yet,
   * tagged with this stack's region in `origin`, and the SNS publisher only
   * publishes readings with this region's `origin`, so each reading is
   * published once across regions. `replicaRegions` is ignored.
   */
  readingsTableName?: string;
  /**
   * Whether the crawler's schedule and the SNS publisher's stream mapping are
   * switched on. Off deploys a region without it crawling or publishing.
   * @default true
   */
  live?: boolean;
  /**
   * Minutes past each 10 that the crawler runs, so crawlers in different
   * regions don't all run at once. Without it, the crawler runs every 10
   * minutes from when the rule was created.
   */
  scheduleOffsetMinutes?: number;
  setDestroyPolicyToAllResources?: boolean;
  /**
   * The stations the crawler collects. Defaults to STATIONS in stations.ts.
   */
  stations?: StationConfig[];
}

export class StorageStack extends Stack {
  public readonly alertsTopic: ITopic;
  public readonly crawlerFunctionName: string;
  public readonly riverLevelsNotificationsTopic: ITopic;
  public readonly riverLevelsTable: ITableV2;
  public readonly riverLevelsTableName: string;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const live = props.live ?? true;
    const multiRegion = props.readingsTableName !== undefined;
    const riverLevelsTable = props.readingsTableName
      ? this.importReadingsTable(props.readingsTableName)
      : new TableV2(this, 'river-levels-table', {
        deletionProtection: !props?.setDestroyPolicyToAllResources,
        dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
        partitionKey: { name: 'station', type: AttributeType.STRING },
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
          recoveryPeriodInDays: 35,
        },
        sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
        replicas: props.replicaRegions
          ? props.replicaRegions.map(function (replicaRegion) {
            return { region: replicaRegion };
          })
          : [],
      });
    this.riverLevelsTable = riverLevelsTable;
    this.riverLevelsTableName = riverLevelsTable.tableName;

    const executionRole = new CrawlerRole(this, 'crawler-role', {
      conditionalWrites: multiRegion,
      dynamoDbTableArn: riverLevelsTable.tableArn,
    });

    const crawlerLogGroup = new LogGroup(this, 'crawler-log-group', {
      retention: RetentionDays.ONE_YEAR,
    });
    const crawler = new CrawlerFunction(this, 'crawler-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        DYNAMODB_READINGS_TABLE: this.riverLevelsTableName,
        ...(multiRegion ? { READINGS_ORIGIN: this.region } : {}),
        STATIONS: JSON.stringify(validateStations(props.stations ?? STATIONS)),
      },
      logGroup: crawlerLogGroup,
      memorySize: 256,
      role: executionRole,
      timeout: Duration.seconds(60),
      tracing: Tracing.ACTIVE,
    });
    this.crawlerFunctionName = crawler.functionName;

    const crawlerDeadLetterQueue = new Queue(this, 'crawler-dead-letter-queue', {
      enforceSSL: true,
      retentionPeriod: Duration.days(14),
    });
    new Rule(this, 'crawler-cron', {
      enabled: live,
      schedule:
        props.scheduleOffsetMinutes === undefined
          ? Schedule.rate(Duration.minutes(10))
          : Schedule.cron({ minute: `${props.scheduleOffsetMinutes}/10` }),
      targets: [
        new LambdaFunction(crawler, {
          deadLetterQueue: crawlerDeadLetterQueue,
          retryAttempts: 3,
        }),
      ],
    });

    const awsSnsKms = Alias.fromAliasName(
      this,
      'aws-managed-sns-kms-key',
      'alias/aws/sns',
    );
    const riverLevelsNotificationsTopic = new Topic(
      this,
      'river-levels-notifications',
      {
        displayName: 'river-levels-notifications',
        masterKey: awsSnsKms,
        enforceSSL: true,
        tracingConfig: TracingConfig.ACTIVE,
      },
    );
    this.riverLevelsNotificationsTopic = riverLevelsNotificationsTopic;

    const snsPublisherLogGroup = new LogGroup(this, 'sns-publisher-group', {
      retention: RetentionDays.ONE_YEAR,
    });
    const snsPublisherExecutionRole = new SnsPublisherRole(
      this,
      'sns-publisher-role',
      {
        dynamoDbTableStreamArn: riverLevelsTable.tableStreamArn!,
        snsTopicArn: riverLevelsNotificationsTopic.topicArn,
      },
    );

    // Receives metadata for stream batches that still fail after retries, so
    // a bad batch is set aside instead of blocking the shard for 24 hours
    const snsPublisherFailureQueue = new Queue(
      this,
      'sns-publisher-failure-queue',
      {
        enforceSSL: true,
        retentionPeriod: Duration.days(14),
      },
    );

    const snsPublisher = new SnsPublisherFunction(this, 'sns-publisher-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        SNS_TOPIC_ARN: riverLevelsNotificationsTopic.topicArn,
      },
      events: [
        new DynamoEventSource(riverLevelsTable, {
          bisectBatchOnError: true,
          // Only set when off, so a live stack's mapping is unchanged
          enabled: live ? undefined : false,
          // Every replica's stream has every reading; only publish the ones
          // this region wrote
          filters: multiRegion
            ? [
              FilterCriteria.filter({
                dynamodb: {
                  NewImage: { origin: { S: FilterRule.isEqual(this.region) } },
                },
              }),
            ]
            : undefined,
          onFailure: new SqsDlq(snsPublisherFailureQueue),
          reportBatchItemFailures: true,
          retryAttempts: 5,
          startingPosition: StartingPosition.LATEST,
        }),
      ],
      logGroup: snsPublisherLogGroup,
      memorySize: 128,
      role: snsPublisherExecutionRole,
      timeout: Duration.seconds(30),
      tracing: Tracing.ACTIVE,
    });
    const alarms = new StorageAlarms(this, 'alarms', {
      alertEmail: props.alertEmail,
      crawler,
      crawlerDeadLetterQueue,
      snsPublisher,
      snsPublisherFailureQueue,
    });
    this.alertsTopic = alarms.alertsTopic;

    // If Destroy Policy Aspect is present:
    if (props?.setDestroyPolicyToAllResources) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'RiverLevelsTable', {
      value: riverLevelsTable.tableArn,
    });
  }

  /**
   * The multi-region readings table's replica in this stack's region. CDK only
   * knows a replica's stream ARN as a wildcard, which an event source mapping
   * can't use, so it's looked up with DescribeTable.
   */
  private importReadingsTable(tableName: string): ITableV2 {
    const tableArn = this.formatArn({
      resource: 'table',
      resourceName: tableName,
      service: 'dynamodb',
    });
    const describe = {
      action: 'describeTable',
      parameters: { TableName: tableName },
      physicalResourceId: PhysicalResourceId.of(`${tableName}-stream`),
      service: 'DynamoDB',
      outputPaths: ['Table.LatestStreamArn'],
    };
    const streamLookup = new AwsCustomResource(this, 'readings-stream-lookup', {
      installLatestAwsSdk: false,
      onCreate: describe,
      onUpdate: describe,
      policy: AwsCustomResourcePolicy.fromSdkCalls({ resources: [tableArn] }),
    });
    return TableV2.fromTableAttributes(this, 'readings-table', {
      tableArn,
      tableStreamArn: streamLookup.getResponseField('Table.LatestStreamArn'),
    });
  }
}
