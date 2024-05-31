import 'aws-sdk-client-mock-jest';
import * as target from '../../src/storage-stack/crawler.lambda';
import * as floodApi from '../../src/storage-stack/flood-api-client/readings';
import * as readingStore from '../../src/storage-stack/store/readings';

jest.mock('../../src/storage-stack/flood-api-client/readings');
jest.mock('../../src/storage-stack/store/readings');

const floodApiMock = floodApi as jest.Mocked<typeof floodApi>;
const readingStoreMock = readingStore as jest.Mocked<typeof readingStore>;

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

    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith([
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

  it('test that we drop anomylous values when only multiple new readings are returned', async () => {
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

    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith([
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

  it('test that we drop anomylous value when only one new reading is returned', async () => {
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

    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith([]);
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

    expect(floodApi.getReadingsSince).toHaveBeenCalledTimes(1);
    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith([]);
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

    expect(floodApi.getReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.getLatestReading).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledTimes(1);
    expect(readingStore.updateReadings).toHaveBeenCalledWith([
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
});
