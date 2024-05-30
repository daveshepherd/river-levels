import { awscdk, github } from 'projen';
import { LambdaRuntime } from 'projen/lib/awscdk';
import { GithubWorkflow } from 'projen/lib/github';
import { JobPermission } from 'projen/lib/github/workflows-model';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  copyrightOwner: 'Dave Shepherd',
  defaultReleaseBranch: 'main',
  deps: [
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-dynamodb',
    'aws-lambda',
    'axios',
  ],
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  devDeps: [
    '@aws-cdk/integ-tests-alpha',
    'aws-sdk-client-mock-jest',
    'aws-sdk-client-mock',
    'cdk-nag',
    'nock',
    'source-map-support',
  ],
  experimentalIntegRunner: true,
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({}),
  },
  lambdaOptions: {
    runtime: LambdaRuntime.NODEJS_20_X,
  },
  license: 'MIT',
  name: 'river-levels',
  projenrcTs: true,
  release: true,
});
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
new GithubWorkflow(project.github!, 'Run-Tests').addJob('build', {
  runsOn: ['ubuntu-latest'],
  permissions: {
    pullRequests: JobPermission.WRITE,
  },
  steps: [
    {
      name: 'Check-out-code',
      uses: 'actions/checkout@v4',
    },
    {
      name: 'Set-up-node',
      uses: 'actions/setup-node@v4',
    },
    {
      name: 'Install dependencies',
      run: 'echo "npm install"',
    },
  ],
});

project.github!.workflows[3].on({
  pullRequestTarget: {
    types: [
      'opened',
      'synchronize',
      'reopened',
      'labeled',
      'ready_for_review',
      'edited',
    ],
  },
});

project.synth();
