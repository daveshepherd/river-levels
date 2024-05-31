import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CrawlerRole } from '../../src/storage-stack/crawler.role';

describe('CrawlerRole', () => {
  test('that default configuration is correct', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');
    new CrawlerRole(stack, 'crawler-role', {
      dynamoDbTableArn: 'someArn',
    });

    const template = Template.fromStack(stack);

    console.log(JSON.stringify(template));
    template.hasResource('AWS::IAM::Role', {});
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Principal: { Service: 'lambda.amazonaws.com' },
          },
        ],
      },
      Description:
        'The service role for running the river levels crawler lambda',
      Path: '/service-role/',
      ManagedPolicyArns: [Match.anyValue(), Match.anyValue(), Match.anyValue()],
    });

    template.hasResource('AWS::IAM::ManagedPolicy', {});
    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      Description: 'Grant access to the river levels table',
      Path: '/service-policy/',
      PolicyDocument: {
        Statement: [
          {
            Resource: 'someArn',
          },
        ],
      },
    });
  });
});
