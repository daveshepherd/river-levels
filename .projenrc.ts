import { DependencyType, github } from 'projen';
import { LambdaRuntime } from 'projen/lib/awscdk';
import { JobPermission } from 'projen/lib/github/workflows-model';
import { NodePackageManager } from 'projen/lib/javascript';
import { CdkTypeScriptApp } from 'projen-modules';

const project = new CdkTypeScriptApp({
  cdkVersion: '2.262.2',
  codeOwners: ['daveshepherd'],
  copyrightOwner: 'Dave Shepherd',
  deps: [
    '@aws-lambda-powertools/logger',
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-sns',
    'axios',
  ],
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  devDeps: [
    // Pinned so integ snapshots only change when these are bumped on purpose.
    // Keep integ-tests-alpha on the same version as the installed aws-cdk-lib.
    '@aws-cdk/integ-runner@2.205.5',
    '@aws-cdk/integ-tests-alpha@2.272.0-alpha.0',
    '@types/node@^24',
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
    jestVersion: '^30',
  },
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({}),
  },
  lambdaOptions: {
    runtime: LambdaRuntime.NODEJS_24_X,
  },
  license: 'MIT',
  majorVersion: 1,
  name: 'river-levels',
  packageManager: NodePackageManager.YARN_CLASSIC,
  projenrcTs: true,
  readme: {
    description: `Collects river level readings from the [Environment Agency flood-monitoring API](https://environment.data.gov.uk/flood-monitoring/doc/reference), stores them in DynamoDB and publishes each new reading to SNS.

Every 10 minutes a crawler Lambda fetches new readings for each station in [\`src/storage-stack/stations.ts\`](src/storage-stack/stations.ts) (currently Kenilworth) and writes them to a DynamoDB global table in \`eu-west-2\`, replicated to \`eu-west-1\`. A second Lambda reads the table's stream and publishes each new reading to the \`river-levels-notifications\` SNS topic as:

\`\`\`json
{"reading_depth": 0.694, "station": "kenilworth", "timestamp": 1718374500000}
\`\`\`

\`reading_depth\` is in metres above stage datum and \`timestamp\` is in epoch milliseconds. CloudWatch alarms email the maintainer when the crawler stops or notifications stall.

See [docs/infrastructure.md](docs/infrastructure.md) for the architecture, data flow, resources, IAM, deployment and alarms.`,
  },
  release: true,
  // Sole maintainer, who can't approve their own pull requests: the queue
  // merges these authors' PRs without an approval. Everyone else needs one.
  trustedAuthors: ['daveshepherd'],
  workflowPackageCache: true,
});

// experimentalIntegRunner adds both integ packages at "latest"; drop those so
// the pinned devDeps above are the only versions.
for (const name of ['@aws-cdk/integ-runner', '@aws-cdk/integ-tests-alpha']) {
  project.deps.removeDependency(name, DependencyType.DEVENV);
}

project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.isolatedModules', true);
// Jest 30 hoists @sinonjs/fake-timers 15, whose bundled types don't match the
// @types/sinon that aws-sdk-client-mock uses. Skip checking library .d.ts files.
project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.skipLibCheck', true);

// ts-jest runs with isolatedModules, so it doesn't type-check. Do it before the tests run.
const typecheck = project.addTask('typecheck', {
  description: 'Type-check source and test files without emitting',
  steps: [
    { exec: 'tsc --noEmit -p tsconfig.json' },
    { exec: 'tsc --noEmit -p test/tsconfig.json' },
  ],
});
project.testTask.prependSpawn(typecheck);

project.addTask('integ:force', {
  description:
    "Run integration snapshot tests, forcing tests to run even if there's no changes",
  steps: [
    {
      exec: 'integ-runner $@ --language typescript --force',
      receiveArgs: true,
    },
  ],
});
project.addTask('integ:watch', {
  description: 'Watch the integration snapshot tests',
  steps: [
    {
      exec: 'integ-runner $@ --language typescript --watch',
      receiveArgs: true,
    },
  ],
});
project.addTask('integ:debug', {
  description:
    'Run integration tests with verbose diagnostics and failure artifacts',
  steps: [
    {
      exec: 'integ-runner $@ --language typescript -vv --inspect-failures',
      receiveArgs: true,
    },
  ],
});
// Actions are pinned to commit SHAs, matching the projen-generated jobs.
// The deploy job checks out the commit that triggered the release (the
// default for push events) and deploys with the release's dist artifact,
// which carries releasetag.txt for the endor:Version tag. It doesn't rebuild:
// the release job already built and tested this commit, and cdk deploy
// bundles the Lambdas itself through the build hook in cdk.json.
const deploymentJob = (stage: 'development' | 'production') => ({
  runsOn: ['ubuntu-latest'],
  permissions: {
    idToken: JobPermission.WRITE,
  },
  if: "needs.release.outputs.tag_exists != 'true'",
  steps: [
    {
      name: 'Checkout',
      // v7.0.1
      uses: 'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
    },
    {
      name: 'Download build artifacts',
      // v8.0.1
      uses: 'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c',
      with: {
        name: 'build-artifact',
        path: 'dist',
      },
    },
    {
      name: 'Setup Node.js',
      // v7.0.0
      uses: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
      with: {
        cache: 'yarn',
      },
    },
    {
      name: 'Install dependencies',
      run: 'yarn install --check-files --frozen-lockfile',
    },
    {
      name: 'configure aws credentials',
      // v6.3.0
      uses: 'aws-actions/configure-aws-credentials@e1253824e5c10ff9df46874f81ed3ec929e19cfd',
      with: {
        'role-to-assume': '${{ secrets.AWS_DEPLOYMENT_ROLE_ARN }}',
        'role-session-name': 'river-levels-deploy',
        'aws-region': 'eu-west-2',
      },
    },
    {
      name: 'deploy',
      run: 'yarn deploy --require-approval never',
      env: {
        ALERT_EMAIL: '${{ secrets.ALERT_EMAIL }}',
        STAGE: stage,
      },
    },
  ],
});
project.github?.tryFindWorkflow('release')?.addJob('deploy_development', {
  name: 'Deploy to Development',
  environment: 'development',
  needs: ['release'],
  ...deploymentJob('development'),
});
project.github?.tryFindWorkflow('release')?.addJob('deploy_production', {
  name: 'Deploy to Production',
  environment: 'production',
  needs: ['release', 'deploy_development'],
  ...deploymentJob('production'),
});
project.readme?.addSection(
  'CDK',
  `On first run of a CDK installation:

\`\`\`sh
npx cdk bootstrap
\`\`\`

Build the project
\`\`\`sh
npx projen build
\`\`\`

Deploy the CDK stack
\`\`\`sh
npx projen deploy
\`\`\``,
);
project.readme?.addSection(
  'Documentation',
  '- [Infrastructure](docs/infrastructure.md): architecture, data flow, resources, IAM and deployment',
);
project.synth();
