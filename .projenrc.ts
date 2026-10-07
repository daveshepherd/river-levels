import { github } from 'projen';
import { LambdaRuntime } from 'projen/lib/awscdk';
import { JobPermission } from 'projen/lib/github/workflows-model';
import { NodePackageManager } from 'projen/lib/javascript';
import { CdkTypeScriptApp } from 'projen-modules';

const project = new CdkTypeScriptApp({
  // Sole maintainer: GitHub doesn't allow approving your own pull requests,
  // so the queue merges once checks pass. Fork PRs are gated by requiring
  // approval before their workflows run (Settings → Actions).
  autoMergeOptions: { approvedReviews: 0 },
  cdkVersion: '2.262.2',
  codeOwners: ['daveshepherd'],
  copyrightOwner: 'Dave Shepherd',
  deps: [
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-sns',
    'axios',
  ],
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  devDeps: [
    '@aws-cdk/integ-tests-alpha',
    '@types/aws-lambda',
    'aws-sdk-client-mock-jest',
    'aws-sdk-client-mock',
    'cdk-nag',
    'nock',
    'projen-modules',
    'source-map-support',
  ],
  experimentalIntegRunner: true,
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
  release: true,
  workflowPackageCache: true,
});

project
  .tryFindObjectFile('test/tsconfig.json')
  ?.addOverride('compilerOptions.isolatedModules', true);

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
const deploymentJob = (stage: 'development' | 'production') => ({
  runsOn: ['ubuntu-latest'],
  permissions: {
    idToken: JobPermission.WRITE,
  },
  if: "needs.release.outputs.tag_exists != 'true'",
  steps: [
    {
      name: 'Checkout',
      uses: 'actions/checkout@v4',
      with: {
        ref: '${{ github.event.pull_request.head.ref }}',
        repository: '${{ github.event.pull_request.head.repo.full_name }}',
      },
    },
    {
      name: 'Download build artifacts',
      uses: 'actions/download-artifact@v4',
      with: {
        name: 'build-artifact',
        path: 'dist',
      },
    },
    {
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v4',
      with: {
        cache: 'yarn',
      },
    },
    {
      name: 'Install dependencies',
      run: 'yarn install --check-files',
    },
    {
      name: 'build',
      run: 'npx projen build',
    },
    {
      name: 'configure aws credentials',
      uses: 'aws-actions/configure-aws-credentials@v3',
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
  needs: ['deploy_development'],
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
