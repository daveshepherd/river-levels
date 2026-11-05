import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import type { Context } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import { resetXClient } from '../../src/notifications-stack/x-client';
import * as target from '../../src/notifications-stack/x-smoke-test.lambda';

const tweet = jest.fn();
const deleteTweet = jest.fn();
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation(() => ({
    readWrite: { v2: { tweet, deleteTweet } },
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
  process.env.RELEASE = 'abc123';
  process.env.X_CREDENTIALS_SECRET_ARN = 'secret-arn';
});

afterEach(() => {
  jest.useRealTimers();
});

describe('x-smoke-test', () => {
  it('posts a unique smoke test and deletes it', async () => {
    await expect(
      target.handler({}, { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ id: '123' });

    expect(tweet).toHaveBeenCalledWith(
      'Smoke test of the river levels X notifier, release abc123, at 2027-01-15T08:00:00.000Z. This post is deleted straight away.',
    );
    expect(deleteTweet).toHaveBeenCalledWith('123');
  });

  it('says the release is local when none is set', async () => {
    delete process.env.RELEASE;

    await target.handler({});

    expect(tweet.mock.calls[0][0]).toContain('release local,');
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
