import { App, Aws, Duration, Tags } from 'aws-cdk-lib';
import { ApiDomainStack } from './api-domain-stack';
import { ApiStack } from './api-stack';
import { DataStack } from './data-stack';
import { NotificationsStack } from './notifications-stack';
import {
  apiCustomDomainEnabled,
  apiDomainName,
  pushAllowedOrigins,
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

// Every region crawls and publishes, against the multi-region readings table.
// The conditional writes store each reading once, and each region publishes
// the readings it wrote.
const regions = [env.region, ...otherRegions];
const storageStacks = new Map(
  regions.map((region, i) => [
    region,
    new StorageStack(app, `RiverLevels-${region}`, {
      alertEmail,
      crossRegionReferences: true,
      env: { region },
      notificationsTopicName,
      readingsTableName: dataStack.readingsTable.tableName,
      // 0, 3 and 6 minutes past each 10, so the crawlers don't all run at once
      scheduleOffsetMinutes: 3 * i,
    }),
  ]),
);
const otherNotificationsTopicArns = (region: string) =>
  regions.filter((other) => other !== region).map(notificationsTopicArn);

// The other two regions' copies of the station files, for CloudFront to fail
// over to, and their X notifiers. Each region's topic only carries the
// readings its crawler wrote, so each API publisher subscribes to the other
// regions' topics too.
const regionalApiStacks = new Map<string, ApiStack>();
for (const region of otherRegions) {
  const regionalStorage = storageStacks.get(region)!;
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
    otherNotificationsTopicArns: otherNotificationsTopicArns(region),
    readingsTable: regionalStorage.riverLevelsTable,
  });
  // The other regions' topics are subscribed to by ARN, so they have to exist
  for (const other of regions.filter((r) => r !== region)) {
    regionalApi.addDependency(storageStacks.get(other)!);
  }
  regionalApiStacks.set(region, regionalApi);

  // The multi-region state table means only one region posts each change.
  // Needs the X credentials parameter in this region.
  new NotificationsStack(app, `RiverLevelsNotifications-${region}`, {
    alertsTopic: regionalStorage.alertsTopic,
    // The state table's name comes from RiverLevelsData, in eu-west-2
    crossRegionReferences: true,
    env: { region },
    mode: xNotifierMode(stage),
    pushSubscriptionsTableName: dataStack.pushSubscriptionsTable.tableName,
    stateTableName: dataStack.notifierStateTable.tableName,
    statusTopic: regionalApi.statusTopic,
  });
}

const storageStack = storageStacks.get(env.region)!;

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
  // The certificate and hosted zone are in us-east-1, the failover bucket in
  // eu-west-1
  crossRegionReferences: true,
  customDomain:
    customDomainEnabled && apiDomainStack.certificate
      ? {
        certificate: apiDomainStack.certificate,
        domainName,
        hostedZone: apiDomainStack.hostedZone,
      }
      : undefined,
  // Time for a reading written in another region to reach this replica
  deliveryDelay: Duration.seconds(30),
  env,
  // Served when this bucket fails. An origin group takes two origins, so
  // eu-central-1's copy is a spare.
  failoverBucket: regionalApiStacks.get('eu-west-1')!.apiBucket,
  notificationsTopic: storageStack.riverLevelsNotificationsTopic,
  otherNotificationsTopicArns: otherNotificationsTopicArns(env.region),
  // Only here: CloudFront can't fail over POST and DELETE to another region
  pushSubscriptions: {
    allowedOrigins: pushAllowedOrigins(stage),
    tableName: dataStack.pushSubscriptionsTable.tableName,
  },
  readingsTable: storageStack.riverLevelsTable,
});
for (const region of otherRegions) {
  apiStack.addDependency(storageStacks.get(region)!);
}

new NotificationsStack(app, 'RiverLevelsNotifications', {
  alertsTopic: storageStack.alertsTopic,
  env,
  mode: xNotifierMode(stage),
  smokeTest: xSmokeTestEnabled(stage),
  pushSubscriptionsTableName: dataStack.pushSubscriptionsTable.tableName,
  stateTableName: dataStack.notifierStateTable.tableName,
  statusTopic: apiStack.statusTopic,
});

Tags.of(app).add('endor:ManagedBy', 'cdk');
Tags.of(app).add('endor:Stage', stage);
// No release version tag: one that changes every release updates every
// resource in every stack, so each deploy takes far longer and AWS Config
// records a change for each resource. The GitHub release records the version.

app.synth();
