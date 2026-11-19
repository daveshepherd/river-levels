import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import {
  TweetV2PostTweetResult,
  TwitterApi,
  TwitterRateLimit,
} from 'twitter-api-v2';
import { logger, tracer } from './powertools';

/** The X app and account credentials stored in the X credentials parameter (OAuth 1.0a user context), as JSON. */
export interface XCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

const ssmClient = tracer.captureAWSv3Client(new SSMClient({}));
let client: TwitterApi | undefined;

/** Reads the credentials parameter, throwing if it hasn't been filled in. */
async function getCredentials(): Promise<XCredentials> {
  const result = await ssmClient.send(
    new GetParameterCommand({
      Name: process.env.X_CREDENTIALS_PARAMETER,
      WithDecryption: true,
    }),
  );
  const credentials = JSON.parse(result.Parameter?.Value ?? '{}') as Partial<XCredentials>;
  const missing = (['appKey', 'appSecret', 'accessToken', 'accessSecret'] as const)
    .filter((key) => !credentials[key]);
  if (missing.length) {
    throw new Error(
      `The X credentials parameter is missing ${missing.join(', ')}. Set it before turning posting on.`,
    );
  }
  return credentials as XCredentials;
}

async function getClient(): Promise<TwitterApi> {
  if (!client) {
    client = new TwitterApi(await getCredentials());
  }
  return client;
}

/** A post, and the posting limits X reported with it. */
export interface PostResult {
  id: string;
  /** The 15-minute window, with the app's (`day`) and account's (`userDay`) 24-hour caps when X sends them. */
  rateLimit?: TwitterRateLimit;
}

/**
 * Runs an X API call, logging the limits X reports if it fails, so a 429
 * shows which limit was hit.
 */
async function withLimitsLogged<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    const { code, rateLimit } = error as { code?: number; rateLimit?: TwitterRateLimit };
    logger.warn('The X API call failed', { code, rateLimit });
    throw error;
  }
}

/** Posts to the X account in the credentials parameter. */
export async function postToX(text: string): Promise<PostResult> {
  const xClient = await getClient();
  const result = await withLimitsLogged(() =>
    xClient.readWrite.v2.post<TweetV2PostTweetResult>(
      'tweets',
      { text },
      { fullResponse: true },
    ),
  );
  return { id: result.data.data.id, rateLimit: result.rateLimit };
}

/** Deletes a post from the X account in the credentials parameter. */
export async function deleteFromX(id: string): Promise<void> {
  const xClient = await getClient();
  const result = await withLimitsLogged(() =>
    xClient.readWrite.v2.deleteTweet(id),
  );
  if (!result.data.deleted) {
    throw new Error(`X did not delete post ${id}`);
  }
}

/** Forgets the cached client. Only for tests. */
export function resetXClient() {
  client = undefined;
}
