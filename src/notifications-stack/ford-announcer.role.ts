import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface FordAnnouncerRoleProps {
  /** The region's replica of the notifier-state table. */
  stateTableArn: string;
  /** The ford-announcements topic. */
  announcementsTopicArn: string;
}

export class FordAnnouncerRole extends Role {
  constructor(scope: Construct, id: string, props: FordAnnouncerRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'The service role for running the river levels ford announcer lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'ford-announcer-policy', {
        description:
          'Read and claim the last state announced per station, and publish announcements',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            resources: [props.stateTableArn],
          }),
          new PolicyStatement({
            actions: ['sns:Publish'],
            resources: [props.announcementsTopicArn],
          }),
        ],
      }),
    );
  }
}
