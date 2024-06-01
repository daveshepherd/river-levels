import { App, Tags } from 'aws-cdk-lib';
import { StorageStack } from './storage-stack';

const app = new App();

const storageStack = new StorageStack(app, 'RiverLevels-dev', {
  env: {
    region: 'eu-west-2',
  },
  replicaRegions: ['eu-west-1'],
});
Tags.of(storageStack).add('endor:ManagedBy', 'cdk');
Tags.of(storageStack).add('endor:Stage', 'development');

app.synth();
