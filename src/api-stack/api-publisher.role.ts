import {
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ApiPublisherRoleProps {
  apiBucketArn: string;
  dynamoDbTableArn: string;
  statusTopicArn: string;
}

export class ApiPublisherRole extends Role {
  constructor(scope: Construct, id: string, props: ApiPublisherRoleProps) {
    super(scope, id, {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      description:
        'The service role for running the river levels API publisher lambda',
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          'service-role/AWSLambdaBasicExecutionRole',
        ),
      ],
      path: '/service-role/',
    });
    this.addManagedPolicy(
      new ManagedPolicy(this, 'api-publisher-policy', {
        description:
          'Read readings from the river levels table, publish station files to the API bucket and station statuses to the status topic',
        path: '/service-policy/',
        statements: [
          new PolicyStatement({
            actions: ['dynamodb:Query'],
            resources: [props.dynamoDbTableArn],
          }),
          new PolicyStatement({
            actions: ['s3:PutObject'],
            resources: [`${props.apiBucketArn}/stations/*`],
          }),
          new PolicyStatement({
            actions: ['sns:Publish'],
            resources: [props.statusTopicArn],
          }),
        ],
      }),
    );
  }
}
