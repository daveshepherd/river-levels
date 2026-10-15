import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CachePolicy, ResponseHeadersPolicy } from 'aws-cdk-lib/aws-cloudfront';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { ApiStack, ApiStackProps } from '../../src/api-stack';

function synth(props: Partial<ApiStackProps> = {}) {
  const app = new App();
  const fixtures = new Stack(app, 'Fixtures', { env: { region: 'eu-west-2' } });
  const readingsTable = new TableV2(fixtures, 'table', {
    partitionKey: { name: 'station', type: AttributeType.STRING },
    sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
  });
  const notificationsTopic = new Topic(fixtures, 'notifications');
  const alertsTopic = new Topic(fixtures, 'alerts');
  const stack = new ApiStack(app, 'ApiStack', {
    alertsTopic,
    env: { region: 'eu-west-2' },
    notificationsTopic,
    readingsTable,
    ...props,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('ApiStack', () => {
  test('that the API bucket is private, encrypted, versioned and retained', () => {
    const { template } = synth();

    template.hasResource('AWS::S3::Bucket', {
      DeletionPolicy: 'Retain',
      Properties: {
        BucketEncryption: {
          ServerSideEncryptionConfiguration: [
            { ServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } },
          ],
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
        VersioningConfiguration: { Status: 'Enabled' },
        LifecycleConfiguration: {
          Rules: [
            Match.objectLike({
              NoncurrentVersionExpiration: { NoncurrentDays: 14 },
            }),
          ],
        },
      },
    });
  });

  test('that new-reading notifications are queued with raw message delivery and a dead-letter queue', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::SNS::Subscription', {
      Protocol: 'sqs',
      RawMessageDelivery: true,
    });
    template.hasResourceProperties('AWS::SQS::Queue', {
      VisibilityTimeout: 360,
      RedrivePolicy: Match.objectLike({ maxReceiveCount: 5 }),
    });
  });

  test('that the publisher reads the queue in batches and reports failures per message', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
      BatchSize: 100,
      MaximumBatchingWindowInSeconds: 60,
      FunctionResponseTypes: ['ReportBatchItemFailures'],
    });
  });

  test('that the publisher is given the bucket, table and stations', () => {
    const { stack, template } = synth({
      legacyStationId: 'a',
      stations: [{ id: 'a', measureId: 'm' }],
    });

    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs24.x',
      Timeout: 60,
      TracingConfig: { Mode: 'Active' },
      Environment: {
        Variables: {
          API_BUCKET: stack.resolve(stack.apiBucket.bucketName),
          DYNAMODB_READINGS_TABLE: Match.anyValue(),
          STATIONS: JSON.stringify([{ id: 'a', measureId: 'm' }]),
        },
      },
    });
  });

  test('that the publisher can only query the table and write station files', () => {
    const { stack, template } = synth();

    template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
      PolicyDocument: {
        Statement: [
          Match.objectLike({ Action: 'dynamodb:Query' }),
          {
            Action: 's3:PutObject',
            Effect: 'Allow',
            Resource: {
              'Fn::Join': [
                '',
                [stack.resolve(stack.apiBucket.bucketArn), '/stations/*'],
              ],
            },
          },
        ],
      },
    });
  });

  test('that the dead-letter queue alarm notifies the alerts topic', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      MetricName: 'ApproximateNumberOfMessagesVisible',
      Threshold: 1,
      AlarmActions: [Match.anyValue()],
      OKActions: [Match.anyValue()],
    });
  });

  test('that there is no alarm without an alerts topic', () => {
    const { template } = synth({ alertsTopic: undefined });

    template.resourceCountIs('AWS::CloudWatch::Alarm', 0);
  });

  test('that everything is destroyed if setDestroyPolicyToAllResources is set', () => {
    const { template } = synth({ setDestroyPolicyToAllResources: true });

    template.hasResource('AWS::S3::Bucket', { DeletionPolicy: 'Delete' });
    template.hasResource('Custom::S3AutoDeleteObjects', {});
    for (const resource of Object.values(template.toJSON().Resources) as Array<{ DeletionPolicy?: string }>) {
      expect(resource.DeletionPolicy ?? 'Delete').toBe('Delete');
    }
  });

  test('that an invalid station list fails the synth', () => {
    expect(() => synth({ stations: [] })).toThrow(
      'At least one station must be configured',
    );
  });

  test('that the distribution serves the bucket over HTTPS through origin access control', () => {
    const { stack, template } = synth();

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        HttpVersion: 'http2and3',
        PriceClass: 'PriceClass_100',
        DefaultCacheBehavior: Match.objectLike({
          AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          CachePolicyId: CachePolicy.CACHING_OPTIMIZED.cachePolicyId,
          Compress: true,
          ResponseHeadersPolicyId:
            ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS.responseHeadersPolicyId,
          ViewerProtocolPolicy: 'redirect-to-https',
          FunctionAssociations: [
            Match.objectLike({ EventType: 'viewer-request' }),
          ],
        }),
        Origins: [
          Match.objectLike({
            DomainName: stack.resolve(stack.apiBucket.bucketRegionalDomainName),
            OriginAccessControlId: Match.anyValue(),
          }),
        ],
      }),
    });
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  test('that only CloudFront can read the bucket', () => {
    const { template } = synth();

    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
          }),
        ]),
      },
    });
  });

  test('that the domain name is a stack output', () => {
    const { template } = synth();

    template.hasOutput('ApiDomainName', {
      Value: { 'Fn::GetAtt': [Match.anyValue(), 'DomainName'] },
    });
  });

  test('that the legacy station must be one of the stations', () => {
    expect(() =>
      synth({ legacyStationId: 'elsewhere' }),
    ).toThrow('legacyStationId elsewhere is not one of the configured stations');
  });
});
