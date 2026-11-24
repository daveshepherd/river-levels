import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { Context, SQSEvent } from 'aws-lambda';
import { mockClient } from 'aws-sdk-client-mock';
import 'aws-sdk-client-mock-jest';
import { resetXClient } from '../../src/notifications-stack/x-client';
import * as target from '../../src/notifications-stack/x-notifier.lambda';

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
const twitterApi = jest.fn();
jest.mock('twitter-api-v2', () => ({
  TwitterApi: jest.fn().mockImplementation((credentials) => {
    twitterApi(credentials);
    return { readWrite: { v2: { post: fullResponsePost } } };
  }),
}));

const ssmMock = mockClient(SSMClient);

const NOW = 1_800_000_000_000;
const CREDENTIALS = {
  appKey: 'k',
  appSecret: 's',
  accessToken: 't',
  accessSecret: 'a',
};

function announcement(transition = 'risingFlooded', station = 'kenilworth') {
  return JSON.stringify({
    id: `${station}:flooded:${NOW}`,
    station,
    transition,
    state: 'flooded',
    previousState: 'clear',
    depth: 1.3,
    lastUpdate: '2027-01-15T08:00:00.000Z',
    announcedAt: new Date(NOW).toISOString(),
  });
}

function sqsEvent(...bodies: string[]): SQSEvent {
  return {
    Records: bodies.map((body, i) => ({ messageId: `m${i + 1}`, body })),
  } as SQSEvent;
}

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  ssmMock.reset();
  tweet.mockReset();
  twitterApi.mockReset();
  resetXClient();
  ssmMock
    .on(GetParameterCommand)
    .resolves({ Parameter: { Value: JSON.stringify(CREDENTIALS) } });
  tweet.mockResolvedValue({ data: { id: '123', text: '' } });
  process.env.MODE = 'post';
  process.env.X_CREDENTIALS_PARAMETER = '/river-levels/x-credentials';
  process.env.STATIONS = JSON.stringify([
    {
      id: 'kenilworth',
      measureId: 'm',
      ford: {
        floodedAboveMetres: 1.23,
        impassableAboveMetres: 1.4,
        website: 'https://kenilworthford.com',
      },
    },
  ]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('x-notifier', () => {
  it('posts an announcement with the ford website', async () => {
    const response = await target.handler(sqsEvent(announcement()));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(twitterApi).toHaveBeenCalledWith(CREDENTIALS);
    expect(tweet).toHaveBeenCalledTimes(1);
    expect(tweet.mock.calls[0][0]).toMatch(
      / See https:\/\/kenilworthford\.com for more details\.$/,
    );
  });

  it('posts without a link for a station with no website', async () => {
    await target.handler(sqsEvent(announcement('droppingClear', 'warwick')));

    expect(tweet).toHaveBeenCalledTimes(1);
    expect(tweet.mock.calls[0][0]).not.toMatch(/See /);
  });

  it('only logs in log mode', async () => {
    process.env.MODE = 'log';

    const response = await target.handler(sqsEvent(announcement()));

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(tweet).not.toHaveBeenCalled();
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 0);
  });

  it('retries only the announcement that failed to post', async () => {
    tweet.mockRejectedValueOnce(new Error('X is down'));

    const response = await target.handler(
      sqsEvent(announcement(), announcement('droppingClear')),
    );

    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'm1' }],
    });
    expect(tweet).toHaveBeenCalledTimes(2);
  });

  it('fails the announcement when the credentials parameter is not filled in', async () => {
    ssmMock.on(GetParameterCommand).resolves({
      Parameter: { Value: JSON.stringify({ ...CREDENTIALS, appKey: '', accessSecret: '' }) },
    });

    const response = await target.handler(sqsEvent(announcement()));

    expect(response).toStrictEqual({
      batchItemFailures: [{ itemIdentifier: 'm1' }],
    });
    expect(tweet).not.toHaveBeenCalled();
  });

  it('fails the announcement when the parameter has no value', async () => {
    ssmMock.on(GetParameterCommand).resolves({});

    const response = await target.handler(sqsEvent(announcement()));

    expect(response.batchItemFailures).toHaveLength(1);
  });

  it('ignores messages that are not JSON or not announcements', async () => {
    const status = JSON.stringify({ station: 'kenilworth', depth: 1.3, state: 'flooded' });
    const response = await target.handler(
      sqsEvent('not json', status, announcement('toString')),
    );

    expect(response).toStrictEqual({ batchItemFailures: [] });
    expect(tweet).not.toHaveBeenCalled();
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    await expect(
      target.handler(sqsEvent(), { awsRequestId: 'req-1' } as Context),
    ).resolves.toStrictEqual({ batchItemFailures: [] });
  });

  it('reuses the X client within a container', async () => {
    await target.handler(sqsEvent(announcement()));
    await target.handler(sqsEvent(announcement('droppingClear')));

    expect(tweet).toHaveBeenCalledTimes(2);
    expect(ssmMock).toHaveReceivedCommandTimes(GetParameterCommand, 1);
    expect(ssmMock).toHaveReceivedCommandWith(GetParameterCommand, {
      Name: '/river-levels/x-credentials',
      WithDecryption: true,
    });
  });
});
