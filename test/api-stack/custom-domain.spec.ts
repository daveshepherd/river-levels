import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AttributeType, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { ApiDomainStack } from '../../src/api-domain-stack';
import { ApiStack } from '../../src/api-stack';

/** Both stacks wired together the way src/main.ts does when the switch is on. */
function synth() {
  const app = new App();
  const fixtures = new Stack(app, 'Fixtures', { env: { region: 'eu-west-2' } });
  const readingsTable = new TableV2(fixtures, 'table', {
    partitionKey: { name: 'station', type: AttributeType.STRING },
    sortKey: { name: 'timestamp', type: AttributeType.NUMBER },
  });
  const notificationsTopic = new Topic(fixtures, 'notifications');

  const domainStack = new ApiDomainStack(app, 'ApiDomainStack', {
    certificate: true,
    crossRegionReferences: true,
    domainName: 'api.example.com',
    env: { region: 'us-east-1' },
  });
  const apiStack = new ApiStack(app, 'ApiStack', {
    crossRegionReferences: true,
    customDomain: {
      certificate: domainStack.certificate!,
      domainName: 'api.example.com',
      hostedZone: domainStack.hostedZone,
    },
    env: { region: 'eu-west-2' },
    notificationsTopic,
    readingsTable,
  });
  return {
    domain: Template.fromStack(domainStack),
    api: Template.fromStack(apiStack),
  };
}

describe('custom API domain', () => {
  test('that the certificate is for the domain and validated in its zone', () => {
    const { domain } = synth();

    domain.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'api.example.com',
      ValidationMethod: 'DNS',
      DomainValidationOptions: [
        {
          DomainName: 'api.example.com',
          HostedZoneId: { Ref: Match.stringLikeRegexp('apizone') },
        },
      ],
    });
  });

  test('that the distribution serves the domain with the certificate and TLS 1.2', () => {
    const { api } = synth();

    api.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: Match.objectLike({
        Aliases: ['api.example.com'],
        ViewerCertificate: {
          AcmCertificateArn: Match.anyValue(),
          MinimumProtocolVersion: 'TLSv1.2_2021',
          SslSupportMethod: 'sni-only',
        },
      }),
    });
  });

  test('that A and AAAA alias records at the zone apex point at the distribution', () => {
    const { api } = synth();

    for (const type of ['A', 'AAAA']) {
      api.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: type,
        Name: 'api.example.com.',
        AliasTarget: Match.objectLike({
          DNSName: { 'Fn::GetAtt': [Match.anyValue(), 'DomainName'] },
          HostedZoneId: Match.anyValue(),
        }),
      });
    }
  });

  test('that the certificate and zone reach the API stack across regions', () => {
    const { domain, api } = synth();

    domain.resourceCountIs('Custom::CrossRegionExportWriter', 1);
    api.resourceCountIs('Custom::CrossRegionExportReader', 1);
  });
});

describe('ApiDomainStack without a certificate', () => {
  test('that there is no certificate by default', () => {
    const app = new App();
    const stack = new ApiDomainStack(app, 'ApiDomainStack', {
      domainName: 'api.example.com',
      env: { region: 'us-east-1' },
    });

    expect(stack.certificate).toBeUndefined();
    Template.fromStack(stack).resourceCountIs(
      'AWS::CertificateManager::Certificate',
      0,
    );
  });
});
