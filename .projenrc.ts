import {
  NodePackageManager,
  UpgradeDependenciesSchedule,
} from 'projen/lib/javascript';
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
    '@aws-sdk/client-ssm',
    'axios',
    'twitter-api-v2',
    // 3.x: 4.0.0 was released in November 2026 after three years without a
    // release, so it waits until it has a track record
    'web-push@^3.6.7',
  ],
  // Weekly rather than daily: each upgrade release changes the Lambdas in
  // every stack and region, and Control Tower's AWS Config recorder charges
  // for each resource change it records
  depsUpgradeOptions: {
    workflowOptions: { schedule: UpgradeDependenciesSchedule.WEEKLY },
  },
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  devDeps: [
    '@types/aws-lambda',
    '@types/web-push',
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

It runs active-active in \`eu-west-2\`, \`eu-west-1\` and \`eu-central-1\`. Every 10 minutes a crawler Lambda in each region fetches new readings for each station in [\`src/storage-stack/stations.ts\`](src/storage-stack/stations.ts) (currently Kenilworth) and writes any that are new to a strongly consistent DynamoDB global table, so each reading is stored once. In each region a second Lambda reads the table's stream and publishes the readings that region wrote to its \`river-levels-notifications\` SNS topic as:

\`\`\`json
{"reading_depth": 0.694, "station": "kenilworth", "timestamp": 1718374500000}
\`\`\`

\`reading_depth\` is in metres above stage datum and \`timestamp\` is in epoch milliseconds.

The \`RiverLevelsApi\` stack queues those notifications and, once per batch, rewrites each station's files in S3. CloudFront serves them at \`api.kenilworthford.com\`, including at the retired flood-readings service's \`/status\` and \`/chart\` paths for Kenilworth, which the website calls:

- \`stations/{id}/status.json\`: the latest depth, whether the river is rising or falling and how fast, and, for a station with a ford, whether the ford is \`clear\`, \`flooded\` or \`impassable\`
- \`stations/{id}/chart.json\`: every reading from the last year, as \`[[timestamp, depth], ...]\`

Each station's status is also published to a \`station-status\` topic. An announcer announces each ford state change (clear, flooded, impassable) once, at most once an hour per station, and a notifier posts it to X. Browsers can subscribe to web push notifications of these changes at \`/push/subscriptions\` on the same domain; each change is sent to them as a notification.

CloudWatch alarms email the maintainer when the crawler stops or notifications stall.

See [docs/infrastructure.md](docs/infrastructure.md) for the architecture, data flow, resources, IAM, deployment and alarms.`,
  },
  release: true,
  // Sole maintainer, who can't approve their own pull requests: the queue
  // merges these authors' PRs without an approval. Everyone else needs one.
  trustedAuthors: ['daveshepherd'],
  workflowPackageCache: true,
});

// Deploy stacks that don't depend on each other at the same time, such as
// the three regional storage stacks
project.cdkTasks.deploy.reset();
project.cdkTasks.deploy.execArgs(['cdk', 'deploy', '--all', '--concurrency', '4'], {
  receiveArgs: true,
});

project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.isolatedModules', true);
// Jest 30 hoists @sinonjs/fake-timers 15, whose bundled types don't match the
// @types/sinon that aws-sdk-client-mock uses. Skip checking library .d.ts files.
project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.skipLibCheck', true);

project.synth();
