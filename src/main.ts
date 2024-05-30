import { App, Tags } from 'aws-cdk-lib';
import { StorageStack } from './storage-stack';

const app = new App();

const storageStack = new StorageStack(app, 'RiverLevels-dev', {});
Tags.of(storageStack).add('ManagedBy', 'CDK');
Tags.of(storageStack).add('Stage', 'dev');

app.synth();
