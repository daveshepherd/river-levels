import { awscdk, github } from 'projen';

const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  copyrightOwner: 'Dave Shepherd',
  defaultReleaseBranch: 'main',
  description:
    'A scraper and APIs for getting river readings from the Environment Agency',
  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({}),
  },
  license: 'MIT',
  name: 'river-levels',
  projenrcTs: true,
  release: true,
});
project.synth();
