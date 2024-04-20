import { existsSync, readFileSync } from 'fs';
import { App, Tags } from 'aws-cdk-lib';
import { StorageStack } from './storage-stack';

const app = new App();

const storageStack = new StorageStack(app, 'RiverLevels', {
  env: {
    region: 'eu-west-2',
  },
  replicaRegions: ['eu-west-1'],
});
Tags.of(storageStack).add('endor:ManagedBy', 'cdk');
Tags.of(storageStack).add('endor:Stage', 'development');

let version = 'local';
if (existsSync('./dist/releasetag.txt')) {
  version = readFileSync('./dist/releasetag.txt', 'utf-8');
}
Tags.of(storageStack).add('endor:Version', version);

app.synth();
