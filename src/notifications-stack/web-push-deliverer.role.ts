import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface WebPushDelivererRoleProps {
  /** The region's replica of the push-subscriptions table. */
  subscriptionsTableArn: string;
  /** The SSM parameter holding the VAPID keys. */
  vapidKeysParameterArn: string;
}

export class WebPushDelivererRole extends Role {
  constructor(scope: Construct, id: string, props: WebPushDelivererRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels web push deliverer lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'web-push-deliverer-policy', {
        description:
          'Read web push subscriptions and remove gone ones, and read the VAPID keys, to send announcements',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['dynamodb:Scan', 'dynamodb:DeleteItem'],
            resources: [props.subscriptionsTableArn],
          }),
          new PolicyStatement({
            actions: ['ssm:GetParameter'],
            resources: [props.vapidKeysParameterArn],
          }),
        ],
      }),
    );
  }
}
