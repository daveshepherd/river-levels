import { awscdk, github } from 'projen';
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: '2.1.0',
  copyrightOwner: 'Dave Shepherd',
  defaultReleaseBranch: 'main',
  license: 'MIT',
  name: 'river-levels',
  projenrcTs: true,
  release: true,

  githubOptions: {
    projenCredentials: github.GithubCredentials.fromApp({}),
  },

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
