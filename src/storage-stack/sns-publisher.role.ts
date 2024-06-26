import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface SnsPublisherRoleProps {
  dynamoDbTableStreamArn: string;
  snsTopicArn: string;
}

export class SnsPublisherRole extends Role {
  constructor(scope: Construct, id: string, props: SnsPublisherRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels sns publisher lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'CloudWatchLambdaInsightsExecutionRolePolicy',
        ),
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    const dynamodbStreamAccessPolicy = new ManagedPolicy(
      this,
      'dynamodb-policy',
      {
        description: 'Grant access to the river levels table',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: [
              'dynamodb:DescribeStream',
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:ListStreams',
            ],
            resources: [props.dynamoDbTableStreamArn],
          }),
        ],
      },
    );
    this.addManagedPolicy(dynamodbStreamAccessPolicy);
    const snsTopicPublishPolicy = new ManagedPolicy(this, 'sns-policy', {
      description: 'Grant access to publish to the SNS topic',
      path: '/service-policy/',
      statements: [
        new PolicyStatement({
          actions: ['sns:Publish'],
          resources: [props.snsTopicArn],
        }),
      ],
    });
    this.addManagedPolicy(snsTopicPublishPolicy);
  }
}
