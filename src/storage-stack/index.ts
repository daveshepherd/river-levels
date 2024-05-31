import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Architecture, LayerVersion, Tracing } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct, IConstruct } from 'constructs';
import * as lambda from './crawler-function';

export interface StorageStackProps extends cdk.StackProps {
  replicaRegions?: Array<string>;
  setDestroyPolicyToAllResources?: boolean;
}

export class StorageStack extends cdk.Stack {
  public readonly crawlerFunctionName: string;
  public readonly riverLevelsTableName: string;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    const riverLevelsTable = new dynamodb.TableV2(this, 'river-levels-table', {
      deletionProtection: props?.setDestroyPolicyToAllResources ? false : true,
      partitionKey: { name: 'station', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      replicas: props.replicaRegions
        ? props.replicaRegions.map(function (replicaRegion) {
          return { region: replicaRegion };
        })
        : [],
    });
    this.riverLevelsTableName = riverLevelsTable.tableName;

    const executionRole = new Role(this, 'crawler-role', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels crawler lambda',
      path: '/service-role/',
    });
    executionRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole',
      ),
    );
    executionRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName(
        'CloudWatchLambdaInsightsExecutionRolePolicy',
      ),
    );
    const dynmodbAccessPolicy = new ManagedPolicy(this, 'crawler-policy', {
      description: 'Grant access to the river levels table',
      path: '/service-policy/',
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:Query', 'dynamodb:Scan', 'dynamodb:UpdateItem'],
          resources: [riverLevelsTable.tableArn],
        }),
      ],
    });
    executionRole.addManagedPolicy(dynmodbAccessPolicy);

    const crawlerLogGroup = new LogGroup(this, 'crawler-log-group', {
      retention: RetentionDays.ONE_YEAR,
    });
    const layerArn =
      'arn:aws:lambda:' +
      cdk.Stack.of(this).region +
      ':580247275435:layer:LambdaInsightsExtension-Arm64:19';
    const layer = LayerVersion.fromLayerVersionArn(
      this,
      'LayerFromArn',
      layerArn,
    );
    const crawler = new lambda.CrawlerFunction(this, 'crawler-lambda', {
      architecture: Architecture.ARM_64,
      environment: {
        DYNAMODB_READINGS_TABLE: this.riverLevelsTableName,
      },
      layers: [layer],
      logGroup: crawlerLogGroup,
      memorySize: 256,
      role: executionRole,
      timeout: cdk.Duration.seconds(60),
      tracing: Tracing.ACTIVE,
    });
    this.crawlerFunctionName = crawler.functionName;

    new Rule(this, 'crawler-cron', {
      enabled: false,
      schedule: Schedule.rate(cdk.Duration.minutes(10)),
      targets: [
        new LambdaFunction(crawler, {
          retryAttempts: 3,
        }),
      ],
    });

    // If Destroy Policy Aspect is present:
    if (props?.setDestroyPolicyToAllResources) {
      cdk.Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new cdk.CfnOutput(this, 'RiverLevelsTable', {
      value: riverLevelsTable.tableArn,
    });
  }
}
class ApplyDestroyPolicyAspect implements cdk.IAspect {
  public visit(node: IConstruct): void {
    if (node instanceof cdk.CfnResource) {
      node.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    }
  }
}
