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
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
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

export interface ApiDistributionProps {
  /** The bucket the station files are published to. */
  bucket: IBucket;
  /** The station served at the original API's /status and /chart paths. */
  legacyStationId: string;
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

    this.distribution = new Distribution(this, 'distribution', {
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
        // Access-Control-Allow-Origin: *, as the original API returned
        responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      httpVersion: HttpVersion.HTTP2_AND_3,
      // North America and Europe, which covers a UK site's visitors
      priceClass: PriceClass.PRICE_CLASS_100,
    });
  }
}
