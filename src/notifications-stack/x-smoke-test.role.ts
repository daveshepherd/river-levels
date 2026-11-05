import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface XSmokeTestRoleProps {
  credentialsSecretArn: string;
}

export class XSmokeTestRole extends Role {
  constructor(scope: Construct, id: string, props: XSmokeTestRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description: 'The service role for running the river levels X smoke test lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'x-smoke-test-policy', {
        description: 'Read the X credentials',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['secretsmanager:GetSecretValue'],
            resources: [props.credentialsSecretArn],
          }),
        ],
      }),
    );
  }
}
