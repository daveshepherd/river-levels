import {
  Aspects,
  CfnOutput,
  CfnResource,
  Duration,
  IAspect,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  AttributeType,
  StreamViewType,
  TableV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Architecture, LayerVersion, Tracing } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import { CrawlerFunction } from './crawler-function';
import { CrawlerRole } from './crawler.role';

export interface StorageStackProps extends StackProps {
  replicaRegions?: Array<string>;
  setDestroyPolicyToAllResources?: boolean;
}

export class StorageStack extends Stack {
  public readonly crawlerFunctionName: string;
  public readonly riverLevelsTableName: string;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const riverLevelsTable = new TableV2(this, 'river-levels-table', {
      deletionProtection: props?.setDestroyPolicyToAllResources ? false : true,
      dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
      partitionKey: { name: 'station', type: AttributeType.STRING },
      pointInTimeRecovery: true,
      sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
      replicas: props.replicaRegions
        ? props.replicaRegions.map(function (replicaRegion) {
          return { region: replicaRegion };
        })
        : [],
    });
    this.riverLevelsTableName = riverLevelsTable.tableName;

    const executionRole = new CrawlerRole(this, 'crawler-role', {
      dynamoDbTableArn: riverLevelsTable.tableArn,
    });

    const crawlerLogGroup = new LogGroup(this, 'crawler-log-group', {
      retention: RetentionDays.ONE_YEAR,
    });
    const layerArn =
      'arn:aws:lambda:' +
      Stack.of(this).region +
      ':580247275435:layer:LambdaInsightsExtension-Arm64:19';
    const layer = LayerVersion.fromLayerVersionArn(
      this,
      'LayerFromArn',
      layerArn,
    );
    const crawler = new CrawlerFunction(this, 'crawler-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        DYNAMODB_READINGS_TABLE: this.riverLevelsTableName,
      },
      layers: [layer],
      logGroup: crawlerLogGroup,
      memorySize: 256,
      role: executionRole,
      timeout: Duration.seconds(60),
      tracing: Tracing.ACTIVE,
    });
    this.crawlerFunctionName = crawler.functionName;

    new Rule(this, 'crawler-cron', {
      enabled: false,
      schedule: Schedule.rate(Duration.minutes(10)),
      targets: [
        new LambdaFunction(crawler, {
          retryAttempts: 3,
        }),
      ],
    });

    // If Destroy Policy Aspect is present:
    if (props?.setDestroyPolicyToAllResources) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'RiverLevelsTable', {
      value: riverLevelsTable.tableArn,
    });
  }
}
class ApplyDestroyPolicyAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
  }
}
