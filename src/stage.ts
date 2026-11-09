export const STAGES = ['local', 'development', 'production'] as const;
export type Stage = (typeof STAGES)[number];

/**
 * Reads the deployment stage from the STAGE environment variable.
 *
 * Local synths and CI builds don't set it and get 'local'. The release
 * workflow's deploy jobs set it to 'development' or 'production'. An
 * unrecognised value fails the synth so resources are never mis-tagged.
 */
export function resolveStage(env: NodeJS.ProcessEnv = process.env): Stage {
  const stage = env.STAGE?.trim();
  if (!stage) {
    return 'local';
  }
  if (!(STAGES as readonly string[]).includes(stage)) {
    throw new Error(
      `Unknown STAGE "${stage}". Expected one of: ${STAGES.join(', ')}`,
    );
  }
  return stage as Stage;
}

const API_DOMAIN_NAMES: Record<Stage, string> = {
  // Only used for local synths and deploys from a developer's machine
  local: 'api.local.kenilworthford.com',
  development: 'api.dev.kenilworthford.com',
  production: 'api.kenilworthford.com',
};

/**
 * The domain the station files are served at for a stage. Each stage's
 * account owns a hosted zone for it, delegated from the kenilworthford.com
 * or dev.kenilworthford.com zone in endor-infrastructure.
 */
export function apiDomainName(stage: Stage): string {
  return API_DOMAIN_NAMES[stage];
}

/**
 * Whether a stage serves the station files at its API domain, with a
 * certificate and alias records, rather than only at the CloudFront domain.
 *
 * Turn a stage on as part of its cutover: the certificate only validates once
 * endor-infrastructure delegates the domain to the stage's hosted zone, which
 * also removes the original flood-readings API's distribution from it. See
 * "API domains" in docs/infrastructure.md.
 */
const API_CUSTOM_DOMAIN_ENABLED: Record<Stage, boolean> = {
  local: false,
  development: true,
  production: true,
};

export function apiCustomDomainEnabled(stage: Stage): boolean {
  return API_CUSTOM_DOMAIN_ENABLED[stage];
}

/** Whether the X notifier posts, or only logs what it would post. */
export type NotifierMode = 'log' | 'post';

/**
 * Each stage's X notifier mode. Development posts to a test X account and
 * production to the kenilworthford.com account, which it took over from
 * flood-readings. See "Notifications" in docs/infrastructure.md.
 */
const X_NOTIFIER_MODES: Record<Stage, NotifierMode> = {
  local: 'log',
  development: 'post',
  production: 'post',
};

export function xNotifierMode(stage: Stage): NotifierMode {
  return X_NOTIFIER_MODES[stage];
}

/**
 * Whether each stage's deploy posts a smoke test to X, and deletes it, failing
 * the deploy if that doesn't work. Only development, which posts to a test
 * account, so the deploy gates production. See "Notifications" in
 * docs/infrastructure.md.
 */
const X_SMOKE_TEST_ENABLED: Record<Stage, boolean> = {
  local: false,
  development: true,
  production: false,
};

export function xSmokeTestEnabled(stage: Stage): boolean {
  return X_SMOKE_TEST_ENABLED[stage];
}
