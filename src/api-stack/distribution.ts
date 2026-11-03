import { Duration } from 'aws-cdk-lib';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  CachedMethods,
  CachePolicy,
  Distribution,
  Function,
  FunctionCode,
  FunctionEventType,
  FunctionRuntime,
  HttpVersion,
  PriceClass,
  ResponseHeadersPolicy,
  SecurityPolicyProtocol,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import {
  AaaaRecord,
  ARecord,
  IHostedZone,
  RecordTarget,
} from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { stationKeys } from './station-keys';

/**
 * The CloudFront Function code that maps the original flood-readings API's
 * paths, /status and /chart, to a station's files. Every other path, such
 * as /stations/{id}/status.json, is passed through unchanged.
 */
export function legacyPathsFunctionCode(stationId: string) {
  const keys = stationKeys(stationId);
  const rewrites = { '/status': `/${keys.status}`, '/chart': `/${keys.chart}` };
  return `function handler(event) {
  var request = event.request;
  var rewrites = ${JSON.stringify(rewrites)};
  var target = rewrites[request.uri.replace(/\\/$/, '')];
  if (target) {
    request.uri = target;
  }
  return request;
}`;
}

/** A custom domain for the distribution, such as api.kenilworthford.com. */
export interface ApiCustomDomain {
  /** The domain, which is also the hosted zone's apex. */
  domainName: string;
  /** A us-east-1 certificate for the domain. */
  certificate: ICertificate;
  /** The domain's hosted zone, where the alias records are created. */
  hostedZone: IHostedZone;
}

export interface ApiDistributionProps {
  /** The bucket the station files are published to. */
  bucket: IBucket;
  /** The station served at the original API's /status and /chart paths. */
  legacyStationId: string;
  /** Serve at a custom domain as well as the CloudFront domain. */
  customDomain?: ApiCustomDomain;
}

/**
 * Serves the station files from the private API bucket over HTTPS, with the
 * CORS header and caching the website expects.
 */
export class ApiDistribution extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: ApiDistributionProps) {
    super(scope, id);

    const legacyPaths = new Function(this, 'legacy-paths', {
      code: FunctionCode.fromInline(
        legacyPathsFunctionCode(props.legacyStationId),
      ),
      comment: 'Maps /status and /chart to a station\'s files',
      runtime: FunctionRuntime.JS_2_0,
    });

    // Access-Control-Allow-Origin: * on every response, as the original API
    // returned. The managed SimpleCORS policy allows no request headers, so
    // CloudFront left the CORS headers off requests carrying ones Chrome adds
    // itself, such as cache-control and pragma on a reload.
    const cors = new ResponseHeadersPolicy(this, 'cors', {
      comment: 'Allow any origin to read the station files',
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['*'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlAllowOrigins: ['*'],
        accessControlMaxAge: Duration.days(1),
        originOverride: true,
      },
    });

    const { customDomain } = props;
    this.distribution = new Distribution(this, 'distribution', {
      ...(customDomain
        ? {
          certificate: customDomain.certificate,
          domainNames: [customDomain.domainName],
          minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
        }
        : {}),
      comment: 'River levels station files',
      defaultBehavior: {
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        // Honours the publisher's Cache-Control: max-age=300
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          {
            eventType: FunctionEventType.VIEWER_REQUEST,
            function: legacyPaths,
          },
        ],
        origin: S3BucketOrigin.withOriginAccessControl(props.bucket),
        responseHeadersPolicy: cors,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      httpVersion: HttpVersion.HTTP2_AND_3,
      // North America and Europe, which covers a UK site's visitors
      priceClass: PriceClass.PRICE_CLASS_100,
    });

    if (customDomain) {
      const target = RecordTarget.fromAlias(
        new CloudFrontTarget(this.distribution),
      );
      new ARecord(this, 'alias-a', { target, zone: customDomain.hostedZone });
      new AaaaRecord(this, 'alias-aaaa', {
        target,
        zone: customDomain.hostedZone,
      });
    }
  }
}
