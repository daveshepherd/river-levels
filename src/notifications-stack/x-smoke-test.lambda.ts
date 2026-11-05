import type { Context } from 'aws-lambda';
import { logger } from './powertools';
import { deleteFromX, postToX } from './x-client';

/**
 * Posts to X and deletes the post straight away, to check the credentials
 * secret, the X client and the account all work. Run by a CDK trigger during
 * the development deploy; throwing fails the deploy, so production isn't
 * deployed. The text includes the release and the time, because X rejects
 * duplicate posts. It logs the posting limits X reports, and how much of
 * each is left.
 */
export async function handler(_event: unknown, context?: Context) {
  if (context) {
    logger.addContext(context);
  }
  const release = process.env.RELEASE ?? 'local';
  const { id, rateLimit } = await postToX(
    `Smoke test of the river levels X notifier, release ${release}, at ${new Date().toISOString()}. This post is deleted straight away.`,
  );
  // rateLimit shows the account's posting limits, which X's console doesn't
  logger.info('Posted the smoke test to X', { id, release, rateLimit });
  await deleteFromX(id);
  logger.info('Deleted the smoke test post', { id });
  return { id };
}
