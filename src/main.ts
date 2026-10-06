import { existsSync, readFileSync } from 'fs';
import { App, Tags } from 'aws-cdk-lib';
import { resolveStage } from './stage';
import { StorageStack } from './storage-stack';

const app = new App();
const stage = resolveStage();

const alertEmail = process.env.ALERT_EMAIL?.trim() || undefined;
if (stage !== 'local' && !alertEmail) {
  throw new Error(
    `ALERT_EMAIL must be set when deploying to ${stage}, so alarms reach someone`,
  );
}

const storageStack = new StorageStack(app, 'RiverLevels', {
  alertEmail,
  env: {
    region: 'eu-west-2',
  },
  replicaRegions: ['eu-west-1'],
});
Tags.of(storageStack).add('endor:ManagedBy', 'cdk');
Tags.of(storageStack).add('endor:Stage', stage);

let version = 'local';
if (existsSync('./dist/releasetag.txt')) {
  version = readFileSync('./dist/releasetag.txt', 'utf-8');
}
Tags.of(storageStack).add('endor:Version', version);

app.synth();
