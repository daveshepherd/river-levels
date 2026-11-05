import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { TwitterApi } from 'twitter-api-v2';
import { tracer } from './powertools';

/** The X app and account credentials stored in the x-credentials secret (OAuth 1.0a user context). */
export interface XCredentials {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

const secretsClient = tracer.captureAWSv3Client(new SecretsManagerClient({}));
let client: TwitterApi | undefined;

/** Reads the credentials secret, throwing if it hasn't been filled in. */
async function getCredentials(): Promise<XCredentials> {
  const result = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: process.env.X_CREDENTIALS_SECRET_ARN }),
  );
  const credentials = JSON.parse(result.SecretString ?? '{}') as Partial<XCredentials>;
  const missing = (['appKey', 'appSecret', 'accessToken', 'accessSecret'] as const)
    .filter((key) => !credentials[key]);
  if (missing.length) {
    throw new Error(
      `The X credentials secret is missing ${missing.join(', ')}. Set it before turning posting on.`,
    );
  }
  return credentials as XCredentials;
}

/** Posts to the X account in the credentials secret. */
export async function postToX(text: string): Promise<string> {
  if (!client) {
    client = new TwitterApi(await getCredentials());
  }
  const result = await client.readWrite.v2.tweet(text);
  return result.data.id;
}

/** Forgets the cached client. Only for tests. */
export function resetXClient() {
  client = undefined;
}
