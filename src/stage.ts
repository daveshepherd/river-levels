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
