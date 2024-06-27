import { awscdk, github } from 'projen';
import { LambdaRuntime } from 'projen/lib/awscdk';
import { JobPermission } from 'projen/lib/github/workflows-model';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  copyrightOwner: 'Dave Shepherd',
  defaultReleaseBranch: 'main',
  deps: [
    '@aws-lambda-powertools/tracer',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-sns',
    'aws-lambda',
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
  majorVersion: 1,
  name: 'river-levels',
  projenrcTs: true,
  release: true,
  workflowPackageCache: true,
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
const deploymentJob = {
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
    },
  ],
};
project.github?.tryFindWorkflow('release')?.addJob('deploy_development', {
  name: 'Deploy to Development',
  environment: 'development',
  needs: ['release'],
  ...deploymentJob,
});
project.github?.tryFindWorkflow('release')?.addJob('deploy_production', {
  name: 'Deploy to Production',
  environment: 'production',
  needs: ['deploy_development'],
  ...deploymentJob,
});
project.synth();
