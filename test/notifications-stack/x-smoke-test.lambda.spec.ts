import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { logger } from '../../src/notifications-stack/powertools';
import { resetXClient } from '../../src/notifications-stack/x-client';
import * as target from '../../src/notifications-stack/x-smoke-test.lambda';

const tweet = jest.fn();
const RATE_LIMIT = {
  limit: 100,
  remaining: 99,
  reset: 1_800_000_900,
  userDay: { limit: 17, remaining: 16, reset: 1_800_086_400 },
};
// The clients call v2.post('tweets', { text }, { fullResponse: true }); tweet
// receives the text and resolves to the response body
async function fullResponsePost(
  url: string,
  body: { text: string },
  options: { fullResponse: boolean },
) {
  expect([url, options]).toStrictEqual(['tweets', { fullResponse: true }]);
  return { data: await tweet(body.text), headers: {}, rateLimit: RATE_LIMIT };
}
const deleteTweet = jest.fn();
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation(() => ({
    readWrite: { v2: { post: fullResponsePost, deleteTweet } },
  })),
}));

const secretsMock = mockClient(SecretsManagerClient);

beforeEach(() => {
  jest.useFakeTimers({ now: Date.parse('2027-01-15T08:00:00.000Z') });
  secretsMock.reset();
  tweet.mockReset();
  deleteTweet.mockReset();
  resetXClient();
  secretsMock.on(GetSecretValueCommand).resolves({
    SecretString: JSON.stringify({
      appKey: 'k',
      appSecret: 's',
      accessToken: 't',
      accessSecret: 'a',
    }),
  });
  tweet.mockResolvedValue({ data: { id: '123', text: '' } });
  deleteTweet.mockResolvedValue({ data: { deleted: true } });
  process.env.X_CREDENTIALS_SECRET_ARN = 'secret-arn';
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('x-smoke-test', () => {
  it('posts a unique smoke test and deletes it', async () => {
    await expect(
      target.handler({}, { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ id: '123' });

    expect(tweet).toHaveBeenCalledWith(
      'Smoke test of the river levels X notifier at 2027-01-15T08:00:00.000Z. This post is deleted straight away.',
    );
    expect(deleteTweet).toHaveBeenCalledWith('123');
  });

  it('logs the posting limits X reports', async () => {
    const info = jest.spyOn(logger, 'info');

    await target.handler({});

    expect(info).toHaveBeenCalledWith('Posted the smoke test to X', {
      id: '123',
      rateLimit: RATE_LIMIT,
    });
  });

  it('logs the limits when X rejects the post', async () => {
    const warn = jest.spyOn(logger, 'warn');
    const limited = Object.assign(new Error('Too Many Requests'), {
      code: 429,
      rateLimit: { ...RATE_LIMIT, userDay: { limit: 17, remaining: 0, reset: 1 } },
    });
    tweet.mockRejectedValue(limited);

    await expect(target.handler({})).rejects.toThrow('Too Many Requests');
    expect(warn).toHaveBeenCalledWith('The X API call failed', {
      code: 429,
      rateLimit: limited.rateLimit,
    });
  });


  it('fails when posting fails', async () => {
    tweet.mockRejectedValue(new Error('X is down'));

    await expect(target.handler({})).rejects.toThrow('X is down');
    expect(deleteTweet).not.toHaveBeenCalled();
  });

  it('fails when X does not delete the post', async () => {
    deleteTweet.mockResolvedValue({ data: { deleted: false } });

    await expect(target.handler({})).rejects.toThrow('X did not delete post 123');
  });
});
