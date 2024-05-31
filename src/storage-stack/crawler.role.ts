import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface CrawlerRoleProps {
  dynamoDbTableArn: string;
}

export class CrawlerRole extends Role {
  constructor(scope: Construct, id: string, props: CrawlerRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels crawler lambda',
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
    const dynmodbAccessPolicy = new ManagedPolicy(this, 'crawler-policy', {
      description: 'Grant access to the river levels table',
      path: '/service-policy/',
      statements: [
        new PolicyStatement({
          actions: ['dynamodb:Query', 'dynamodb:Scan', 'dynamodb:UpdateItem'],
          resources: [props.dynamoDbTableArn],
        }),
      ],
    });
    this.addManagedPolicy(dynmodbAccessPolicy);
  }
}
