import 'source-map-support/register';
import { ExpectedResult, IntegTest } from '@aws-cdk/integ-tests-alpha';
import { App, Aspects, Stack, Tags } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { ApiDomainStack } from '../../src/api-domain-stack';

const app = new App();
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

// A made-up domain: Route 53 creates public zones for any name, and nothing
// delegates to this one.
const domainName = 'api.integ.river-levels.example';

const stackUnderTest = new ApiDomainStack(app, 'IntegrationTestApiDomainStack', {
  domainName,
  env: { region: 'us-east-1' },
  setDestroyPolicyToAllResources: true,
});
Tags.of(stackUnderTest).add('endor:ManagedBy', 'cdk');
Tags.of(stackUnderTest).add('endor:Stage', 'development');

// The assertions reference the zone, so they need a stack in the same
// explicit region; the default assertion stack has none.
const integ = new IntegTest(app, 'ApiDomainTest', {
  assertionStack: new Stack(app, 'ApiDomainTestAssertions', {
    env: { region: 'us-east-1' },
  }),
  testCases: [stackUnderTest],
});

integ.assertions
  .awsApiCall('Route53', 'GetHostedZone', {
    Id: stackUnderTest.hostedZone.hostedZoneId,
  })
  .expect(
    ExpectedResult.objectLike({
      HostedZone: { Name: `${domainName}.` },
    }),
  );
