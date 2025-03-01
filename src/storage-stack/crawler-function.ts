// ~~ Generated by projen. To modify, edit .projenrc.ts and run "npx projen".
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Props for CrawlerFunction
 */
export interface CrawlerFunctionProps extends lambda.FunctionOptions {
}

/**
 * An AWS Lambda function which executes src/storage-stack/crawler.
 */
export class CrawlerFunction extends lambda.Function {
  constructor(scope: Construct, id: string, props?: CrawlerFunctionProps) {
    super(scope, id, {
      description: 'src/storage-stack/crawler.lambda.ts',
      ...props,
      runtime: new lambda.Runtime('nodejs22.x', lambda.RuntimeFamily.NODEJS),
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../assets/storage-stack/crawler.lambda')),
    });
    this.addEnvironment('AWS_NODEJS_CONNECTION_REUSE_ENABLED', '1', { removeInEdge: true });
  }
}