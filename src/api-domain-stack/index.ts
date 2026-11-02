import {
  Aspects,
  CfnOutput,
  Fn,
  RemovalPolicy,
  Stack,
  StackProps,
} from 'aws-cdk-lib';
import { PublicHostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { ApplyDestroyPolicyAspect } from '../destroy-policy';

export interface ApiDomainStackProps extends StackProps {
  /** The domain the station files are served at, such as api.kenilworthford.com. */
  domainName: string;
  setDestroyPolicyToAllResources?: boolean;
}

/**
 * The hosted zone for the API's domain. It's in its own stack, in us-east-1,
 * because the CloudFront certificate that's validated against it must be in
 * us-east-1, and the API stack uses both.
 *
 * The parent zone (kenilworthford.com or dev.kenilworthford.com, in
 * endor-infrastructure) delegates the domain to this zone with NS records
 * for the NameServers output.
 */
export class ApiDomainStack extends Stack {
  public readonly hostedZone: PublicHostedZone;

  constructor(scope: Construct, id: string, props: ApiDomainStackProps) {
    super(scope, id, props);
    const destroy = props.setDestroyPolicyToAllResources ?? false;

    this.hostedZone = new PublicHostedZone(this, 'api-zone', {
      comment: 'River levels station files API',
      zoneName: props.domainName,
    });
    // Recreating the zone would give it new name servers and break the
    // delegation from the parent zone, so keep it if the stack is deleted.
    this.hostedZone.applyRemovalPolicy(
      destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
    );

    if (destroy) {
      Aspects.of(this).add(new ApplyDestroyPolicyAspect());
    }
    new CfnOutput(this, 'NameServers', {
      description:
        'Delegate the domain to these name servers with NS records in the parent zone',
      value: Fn.join(',', this.hostedZone.hostedZoneNameServers!),
    });
    new CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
    });
  }
}
