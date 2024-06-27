// ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for SnsPublisherFunction
 */
export interface SnsPublisherFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/storage-stack/sns-publisher.
 */
export class SnsPublisherFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: SnsPublisherFunctionProps) {
    super(scope, id, {
      description: 'src/storage-stack/sns-publisher.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs20.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../assets/storage-stack/sns-publisher.lambda')),
    });
    this.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }
}