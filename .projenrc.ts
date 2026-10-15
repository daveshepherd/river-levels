import { NodePackageManager } from 'projen/lib/javascript';
import { CdkTypeScriptApp } from 'projen-modules';

const project = new CdkTypeScriptApp({
  cdkVersion: '2.272.0',
  codeOwners: ['daveshepherd'],
  copyrightOwner: 'Dave Shepherd',
  deps: [
    '@aws-lambda-powertools/logger',
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-s3',
    '@aws-sdk/client-sns',
    'axios',
  ],
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  devDeps: [
    '@types/aws-lambda',
    'aws-sdk-client-mock-jest',
    'aws-sdk-client-mock',
    'cdk-nag',
    'nock',
    'projen-modules',
    'source-map-support',
  ],
  experimentalIntegRunner: true,
  jestOptions: {
    jestConfig: {
      setupFiles: ['<rootDir>/test/setup.ts'],
    },
  },
  deployments: [
    {
      environment: 'development',
      region: 'eu-west-2',
      env: {
        ALERT_EMAIL: '${{ secrets.ALERT_EMAIL }}',
        STAGE: 'development',
      },
    },
    {
      environment: 'production',
      region: 'eu-west-2',
      env: {
        ALERT_EMAIL: '${{ secrets.ALERT_EMAIL }}',
        STAGE: 'production',
      },
    },
  ],
  license: 'MIT',
  majorVersion: 1,
  name: 'river-levels',
  packageManager: NodePackageManager.YARN_CLASSIC,
  projenrcTs: true,
  readme: {
    description: `Collects river level readings from the [Environment Agency flood-monitoring API](https://environment.data.gov.uk/flood-monitoring/doc/reference), stores them in DynamoDB, publishes each new reading to SNS, and keeps a status and chart file for each station for the [kenilworthford.com](https://kenilworthford.com) website.

Every 10 minutes a crawler Lambda fetches new readings for each station in [\`src/storage-stack/stations.ts\`](src/storage-stack/stations.ts) (currently Kenilworth) and writes them to a DynamoDB global table in \`eu-west-2\`, replicated to \`eu-west-1\`. A second Lambda reads the table's stream and publishes each new reading to the \`river-levels-notifications\` SNS topic as:

\`\`\`json
{"reading_depth": 0.694, "station": "kenilworth", "timestamp": 1718374500000}
\`\`\`

\`reading_depth\` is in metres above stage datum and \`timestamp\` is in epoch milliseconds.

The \`RiverLevelsApi\` stack queues those notifications and, once per batch, rewrites each station's files in S3. They will replace the original flood-readings service's \`/status\` and \`/chart\` API once they're served through CloudFront:

- \`stations/{id}/status.json\`: the latest depth, whether the river is rising or falling and how fast, and, for a station with a ford, whether the ford is \`clear\`, \`flooded\` or \`impassable\`
- \`stations/{id}/chart.json\`: every reading from the last year, as \`[[timestamp, depth], ...]\`

CloudWatch alarms email the maintainer when the crawler stops or notifications stall.

See [docs/infrastructure.md](docs/infrastructure.md) for the architecture, data flow, resources, IAM, deployment and alarms.`,
  },
  release: true,
  // Sole maintainer, who can't approve their own pull requests: the queue
  // merges these authors' PRs without an approval. Everyone else needs one.
  trustedAuthors: ['daveshepherd'],
  workflowPackageCache: true,
});

// The app has more than one stack (RiverLevels, RiverLevelsApi), and cdk
// deploy needs --all or stack names to deploy more than one.
project.cdkTasks.deploy.reset('cdk deploy --all', { receiveArgs: true });

project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.isolatedModules', true);
// Jest 30 hoists @sinonjs/fake-timers 15, whose bundled types don't match the
// @types/sinon that aws-sdk-client-mock uses. Skip checking library .d.ts files.
project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.skipLibCheck', true);

project.synth();
