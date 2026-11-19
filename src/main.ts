import { existsSync, readFileSync } from 'fs';
import { App, Aws, Duration, Tags } from 'aws-cdk-lib';
import { ApiDomainStack } from './api-domain-stack';
import { ApiStack } from './api-stack';
import { DataStack } from './data-stack';
import { NotificationsStack } from './notifications-stack';
import {
  apiCustomDomainEnabled,
  apiDomainName,
  resolveStage,
  xNotifierMode,
  xSmokeTestEnabled,
} from './stage';
import { StorageStack } from './storage-stack';

const app = new App();
const stage = resolveStage();

const alertEmail = process.env.ALERT_EMAIL?.trim() || undefined;
if (stage !== 'local' && !alertEmail) {
  throw new Error(
    `ALERT_EMAIL must be set when deploying to ${stage}, so alarms reach someone`,
  );
}

const env = { region: 'eu-west-2' };

// The strongly consistent global tables for running in three regions. See
// docs/adr/0001-multi-region-active-active.md
const otherRegions: [string, string] = ['eu-west-1', 'eu-central-1'];
const dataStack = new DataStack(app, 'RiverLevelsData', {
  // The regional stacks use the table names
  crossRegionReferences: true,
  env,
  replicaRegions: otherRegions,
});

// The regional new-reading topics have a fixed name, so each region's API
// publisher can subscribe to the others' by ARN
const notificationsTopicName = 'river-levels-notifications';
const notificationsTopicArn = (region: string) =>
  `arn:${Aws.PARTITION}:sns:${region}:${Aws.ACCOUNT_ID}:${notificationsTopicName}`;

// The other two regions, against the multi-region readings table. Not live
// until the cutover, so they don't crawl or publish alongside eu-west-2.
otherRegions.forEach((region, i) => {
  const regionalStorage = new StorageStack(app, `RiverLevels-${region}`, {
    alertEmail,
    crossRegionReferences: true,
    env: { region },
    live: false,
    notificationsTopicName,
    readingsTableName: dataStack.readingsTable.tableName,
    // eu-west-2 will run at 0 minutes past each 10
    scheduleOffsetMinutes: 3 * (i + 1),
  });

  // Keeps this region's copy of the station files current, for CloudFront to
  // fail over to. Each region's topic only carries the readings its crawler
  // wrote, so it subscribes to the other regions' topics too.
  const regionalApi = new ApiStack(app, `RiverLevelsApi-${region}`, {
    alertsTopic: regionalStorage.alertsTopic,
    allowCloudFrontInAccount: true,
    createDistribution: false,
    // The readings table's name comes from RiverLevelsData, in eu-west-2
    crossRegionReferences: true,
    // Time for a reading written in another region to reach this replica
    deliveryDelay: Duration.seconds(30),
    env: { region },
    notificationsTopic: regionalStorage.riverLevelsNotificationsTopic,
    otherNotificationsTopicArns: otherRegions
      .filter((other) => other !== region)
      .map(notificationsTopicArn),
    readingsTable: regionalStorage.riverLevelsTable,
  });

  // Posts ford state changes from this region too. The multi-region state
  // table means only one region posts each change. Log mode until the
  // cutover, and until the X credentials parameter is created in this region.
  new NotificationsStack(app, `RiverLevelsNotifications-${region}`, {
    alertsTopic: regionalStorage.alertsTopic,
    // The state table's name comes from RiverLevelsData, in eu-west-2
    crossRegionReferences: true,
    env: { region },
    mode: 'log',
    stateTableName: dataStack.notifierStateTable.tableName,
    statusTopic: regionalApi.statusTopic,
  });
});

const storageStack = new StorageStack(app, 'RiverLevels', {
  alertEmail,
  env,
  replicaRegions: ['eu-west-1'],
});

const domainName = apiDomainName(stage);
const customDomainEnabled = apiCustomDomainEnabled(stage);

// us-east-1, where the API's CloudFront certificate has to be
const apiDomainStack = new ApiDomainStack(app, 'RiverLevelsApiDomain', {
  certificate: customDomainEnabled,
  // The API stack, in eu-west-2, uses the certificate and the hosted zone
  crossRegionReferences: true,
  domainName,
  env: { region: 'us-east-1' },
});

const apiStack = new ApiStack(app, 'RiverLevelsApi', {
  alertsTopic: storageStack.alertsTopic,
  crossRegionReferences: true,
  customDomain:
    customDomainEnabled && apiDomainStack.certificate
      ? {
        certificate: apiDomainStack.certificate,
        domainName,
        hostedZone: apiDomainStack.hostedZone,
      }
      : undefined,
  env,
  notificationsTopic: storageStack.riverLevelsNotificationsTopic,
  readingsTable: storageStack.riverLevelsTable,
});

new NotificationsStack(app, 'RiverLevelsNotifications', {
  alertsTopic: storageStack.alertsTopic,
  env,
  mode: xNotifierMode(stage),
  smokeTest: xSmokeTestEnabled(stage),
  statusTopic: apiStack.statusTopic,
});

Tags.of(app).add('endor:ManagedBy', 'cdk');
Tags.of(app).add('endor:Stage', stage);

let version = 'local';
if (existsSync('./dist/releasetag.txt')) {
  version = readFileSync('./dist/releasetag.txt', 'utf-8');
}
Tags.of(app).add('endor:Version', version);

app.synth();
