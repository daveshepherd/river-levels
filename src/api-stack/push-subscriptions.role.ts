import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface PushSubscriptionsRoleProps {
  /** The region's replica of the push-subscriptions table. */
  subscriptionsTableArn: string;
}

export class PushSubscriptionsRole extends Role {
  constructor(scope: Construct, id: string, props: PushSubscriptionsRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels push subscriptions lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'push-subscriptions-policy', {
        description: 'Add and remove web push subscriptions',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['dynamodb:PutItem', 'dynamodb:DeleteItem'],
            resources: [props.subscriptionsTableArn],
          }),
        ],
      }),
    );
  }
}
