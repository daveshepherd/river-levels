import 'aws-sdk-client-mock-jest';
import type { Context } from 'aws-lambda';
import * as target from '../../src/storage-stack/crawler.lambda';
import * as floodApi from '../../src/storage-stack/flood-api-client/readings';
import { logger } from '../../src/storage-stack/powertools';
import * as readingStore from '../../src/storage-stack/store/readings';

jest.mock('../../src/storage-stack/flood-api-client/readings');
jest.mock('../../src/storage-stack/store/readings');

const floodApiMock = floodApi as jest.Mocked<typeof floodApi>;
const readingStoreMock = readingStore as jest.Mocked<typeof readingStore>;

const KENILWORTH = { id: 'kenilworth', measureId: '2627-level-stage-i-15_min-mASD' };

beforeEach(() => {
  process.env.STATIONS = JSON.stringify([KENILWORTH]);
});

describe('crawler', () => {
  it('basic test', async () => {
    floodApiMock.getReadingsSince.mockResolvedValue([
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);

    const latestReadingDate = new Date();
    latestReadingDate.setDate(latestReadingDate.getDate() - 1);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.833,
    });

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', [
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);
  });

  it('test that we drop anomalous values when only multiple new readings are returned', async () => {
    floodApiMock.getReadingsSince.mockResolvedValue([
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 3.1,
      },
    ]);

    const latestReadingDate = new Date();
    latestReadingDate.setDate(latestReadingDate.getDate() - 1);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.833,
    });

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', [
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
    ]);
  });

  it('test that we drop anomalous value when only one new reading is returned', async () => {
    floodApiMock.getReadingsSince.mockResolvedValue([
      {
        date: new Date('2022-10-11T01:00:00Z'),
        depth: 3.672,
      },
    ]);

    const latestReadingDate = new Date();
    latestReadingDate.setDate(latestReadingDate.getDate() - 1);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.659,
    });

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', []);
  });

  it('test that no new readings is ok', async () => {
    floodApiMock.getReadingsSince.mockResolvedValue([]);

    const latestReadingDate = new Date();
    latestReadingDate.setDate(latestReadingDate.getDate() - 1);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.833,
    });

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', []);
  });

  it('should only get a limited number of dates if the stored data is too old', async () => {
    floodApiMock.getReadings.mockResolvedValue([
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);

    readingStoreMock.getLatestReading.mockResolvedValue({
      date: new Date('2020-01-01T11:00:00Z'),
      depth: 0.833,
    });

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadings).toHaveBeenCalledWith('2627-level-stage-i-15_min-mASD', 96);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', [
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);
  });

  it('should only retrieve the number of readings passed into the request', async () => {
    floodApiMock.getReadings.mockResolvedValue([
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);

    readingStoreMock.getLatestReading.mockResolvedValue(null);

    await target.handler({
      readingsLimit: 1,
    });

    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadings).toHaveBeenCalledTimes(1);
    expect(floodApi.getReadings).toHaveBeenCalledWith('2627-level-stage-i-15_min-mASD', 1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', [
      {
        date: new Date('2020-01-01T11:45:00Z'),
        depth: 0.83,
      },
      {
        date: new Date('2020-01-01T11:30:00Z'),
        depth: 0.831,
      },
      {
        date: new Date('2020-01-01T11:15:00Z'),
        depth: 0.831,
      },
    ]);
  });

  it('keeps a large rise when it follows a gap in the stored readings', async () => {
    const latestReadingDate = new Date();
    latestReadingDate.setHours(latestReadingDate.getHours() - 3);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.6,
    });
    const afterGap = [
      { date: new Date(Date.now() - 15 * 60 * 1000), depth: 3.2 },
      { date: new Date(Date.now() - 30 * 60 * 1000), depth: 3.1 },
    ];
    floodApiMock.getReadingsSince.mockResolvedValue(afterGap);

    await target.handler();

    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', afterGap);
  });

  it('fails without fetching readings when the latest reading lookup fails', async () => {
    readingStoreMock.getLatestReading.mockRejectedValue(new Error('query failed'));

    await expect(target.handler()).rejects.toThrow(
      'Crawl failed for stations: kenilworth',
    );
    expect(floodApi.getReadingsSince).not.toHaveBeenCalled();
    expect(floodApi.getReadings).not.toHaveBeenCalled();
    expect(readingStore.updateReadings).not.toHaveBeenCalled();
  });

  it('fails without writing when the flood API fails', async () => {
    readingStoreMock.getLatestReading.mockResolvedValue(null);
    floodApiMock.getReadings.mockRejectedValue(new Error('API unavailable'));

    await expect(target.handler()).rejects.toThrow(
      'Crawl failed for stations: kenilworth',
    );
    expect(readingStore.updateReadings).not.toHaveBeenCalled();
  });

  it('adds the Lambda context to log entries when one is passed', async () => {
    readingStoreMock.getLatestReading.mockResolvedValue(null);
    floodApiMock.getReadings.mockResolvedValue([]);
    const addContext = jest.spyOn(logger, 'addContext');
    const context = { functionName: 'crawler', awsRequestId: 'req-1' } as Context;

    await target.handler(undefined, context);

    expect(addContext).toHaveBeenCalledWith(context);
    addContext.mockRestore();
  });

  it('reads and writes each station with its own measure and id', async () => {
    process.env.STATIONS = JSON.stringify([
      KENILWORTH,
      { id: 'warwick', measureId: '2626-level-stage-i-15_min-mASD' },
    ]);
    readingStoreMock.getLatestReading.mockResolvedValue(null);
    floodApiMock.getReadings.mockResolvedValue([]);

    await target.handler();

    expect(readingStore.getLatestReading).toHaveBeenCalledWith('kenilworth');
    expect(readingStore.getLatestReading).toHaveBeenCalledWith('warwick');
    expect(floodApi.getReadings).toHaveBeenCalledWith(KENILWORTH.measureId, 96);
    expect(floodApi.getReadings).toHaveBeenCalledWith('2626-level-stage-i-15_min-mASD', 96);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', []);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('warwick', []);
  });

  it('still crawls the other stations when one fails, then fails the invocation', async () => {
    process.env.STATIONS = JSON.stringify([
      { id: 'broken', measureId: 'broken-measure' },
      KENILWORTH,
    ]);
    readingStoreMock.getLatestReading.mockResolvedValue(null);
    floodApiMock.getReadings.mockImplementation(async (measureId) => {
      if (measureId === 'broken-measure') {
        throw new Error('API unavailable');
      }
      return [];
    });

    await expect(target.handler()).rejects.toThrow(
      'Crawl failed for stations: broken',
    );
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', []);
  });

  it("uses a station's own spike threshold when it has one", async () => {
    process.env.STATIONS = JSON.stringify([
      { ...KENILWORTH, maxDepthRiseMetres: 0.5 },
    ]);
    const latestReadingDate = new Date();
    latestReadingDate.setDate(latestReadingDate.getDate() - 1);
    readingStoreMock.getLatestReading.mockResolvedValue({
      date: latestReadingDate,
      depth: 0.8,
    });
    const rise = { date: new Date('2020-01-01T11:45:00Z'), depth: 1.4 };
    const small = { date: new Date('2020-01-01T11:30:00Z'), depth: 1.0 };
    floodApiMock.getReadingsSince.mockResolvedValue([rise, small]);

    await target.handler();

    expect(readingStore.updateReadings).toHaveBeenCalledWith('kenilworth', [small]);
  });

  it('fails when STATIONS is not set', async () => {
    delete process.env.STATIONS;

    await expect(target.handler()).rejects.toThrow(
      'The STATIONS environment variable is not set',
    );
  });
});
