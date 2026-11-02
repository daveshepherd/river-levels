import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApiDomainStack } from '../../src/api-domain-stack';

function synth(setDestroyPolicyToAllResources?: boolean) {
  const app = new App();
  const stack = new ApiDomainStack(app, 'ApiDomainStack', {
    domainName: 'api.example.com',
    env: { region: 'us-east-1' },
    setDestroyPolicyToAllResources,
  });
  return { stack, template: Template.fromStack(stack) };
}

describe('ApiDomainStack', () => {
  test('that it creates a retained public hosted zone for the domain', () => {
    const { template } = synth();

    template.resourceCountIs('AWS::Route53::HostedZone', 1);
    template.hasResource('AWS::Route53::HostedZone', {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
      Properties: {
        Name: 'api.example.com.',
        HostedZoneConfig: { Comment: 'River levels station files API' },
      },
    });
  });

  test('that the name servers and zone ID are stack outputs', () => {
    const { template } = synth();

    template.hasOutput('NameServers', {
      Value: {
        'Fn::Join': [',', { 'Fn::GetAtt': [Match.anyValue(), 'NameServers'] }],
      },
    });
    template.hasOutput('HostedZoneId', { Value: { Ref: Match.anyValue() } });
  });

  test('that the zone is destroyed if setDestroyPolicyToAllResources is set', () => {
    const { template } = synth(true);

    template.hasResource('AWS::Route53::HostedZone', {
      DeletionPolicy: 'Delete',
    });
  });
});
