import {
  Aspects,
  CfnOutput,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import {
  AttributeType,
  MultiRegionConsistency,
  StreamViewType,
  TableV2,
} from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';

export interface DataStackProps extends StackProps {
  /**
   * The two other regions with a replica. With the stack's own region they
   * make the three a multi-Region strong consistency (MRSC) table needs. They
   * can't be changed after the tables are created.
   */
  replicaRegions: [string, string];
  setDestroyPolicyToAllResources?: boolean;
}

/**
 * The global tables every region reads and writes, with multi-Region strong
 * consistency, so a conditional write in one region sees writes made in the
 * others. That is what lets every region run the crawler and the notifier
 * without duplicating readings or posts. See
 * docs/adr/0001-multi-region-active-active.md.
 */
export class DataStack extends Stack {
  public readonly readingsTable: TableV2;
  public readonly notifierStateTable: TableV2;

  constructor(scope: Construct, id: string, props: DataStackProps) {
    super(scope, id, props);
    const destroy = props.setDestroyPolicyToAllResources ?? false;
    const replicas = props.replicaRegions.map((region) => ({ region }));

    // Each reading, written once by whichever region's crawler gets there
    // first. Items carry the region that wrote them in `origin`.
    this.readingsTable = new TableV2(this, 'readings', {
      deletionProtection: !destroy,
      dynamoStream: StreamViewType.NEW_AND_OLD_IMAGES,
      multiRegionConsistency: MultiRegionConsistency.STRONG,
      partitionKey: { name: 'station', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled: true,
        recoveryPeriodInDays: 35,
      },
      removalPolicy: destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      replicas,
      sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
    });

    // The last state announced for each station, claimed with a conditional
    // write so only one region posts each change
    this.notifierStateTable = new TableV2(this, 'notifier-state', {
      deletionProtection: !destroy,
      multiRegionConsistency: MultiRegionConsistency.STRONG,
      partitionKey: { name: 'station', type: AttributeType.STRING },
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      removalPolicy: destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      replicas,
    });

    if (destroy) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'ReadingsTableName', {
      value: this.readingsTable.tableName,
    });
    new CfnOutput(this, 'NotifierStateTableName', {
      value: this.notifierStateTable.tableName,
    });
  }
}
