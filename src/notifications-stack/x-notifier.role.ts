import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface XNotifierRoleProps {
  stateTableArn: string;
  credentialsSecretArn: string;
}

export class XNotifierRole extends Role {
  constructor(scope: Construct, id: string, props: XNotifierRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'The service role for running the river levels X notifier lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'x-notifier-policy', {
        description:
          'Read and record the last state posted per station, and read the X credentials',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['dynamodb:GetItem', 'dynamodb:PutItem'],
            resources: [props.stateTableArn],
          }),
          new PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [props.credentialsSecretArn],
          }),
        ],
      }),
    );
  }
}
