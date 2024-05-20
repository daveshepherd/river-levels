import nock from 'nock';
// import 'aws-sdk-client-mock-jest';

import * as target from '../../src/flood-api-client/readings';

describe('crawler flood readings api client', () => {
  it('test the API records are returned successfully when queried by date', async () => {
    const testResponse = {
      '@context':
        'http://environment.data.gov.uk/flood-monitoring/meta/context.jsonld',
      'meta': {
        publisher: 'Environment Agency',
      },
      'items': [
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T13-00-00Z',
          'dateTime': '2020-01-01T11:45:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.83,
        },
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T12-45-00Z',
          'dateTime': '2020-01-01T11:30:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.831,
        },
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T12-30-00Z',
          'dateTime': '2020-01-01T11:15:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.831,
        },
      ],
    };
    nock('https://environment.data.gov.uk')
      .get(
        '/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings?_sorted&since=2020-03-02T13:00:00.000Z',
      )
      .reply(200, JSON.stringify(testResponse));

    const actualReadings = await target.getReadingsSince(
      new Date('2020-03-02T13:00:00Z'),
    );

    const expectedReadings = [
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
    ];
    expect(actualReadings).toEqual(expectedReadings);
  });

  it('test that an empty list is returned if there are no readings when queried by date', async () => {
    const testResponse = {
      '@context':
        'http://environment.data.gov.uk/flood-monitoring/meta/context.jsonld',
      'meta': {
        publisher: 'Environment Agency',
      },
      'items': [],
    };
    nock('https://environment.data.gov.uk')
      .get(
        '/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings?_sorted&since=2020-03-02T13:00:00.000Z',
      )
      .reply(200, JSON.stringify(testResponse));

    const actualReadings = await target.getReadingsSince(
      new Date('2020-03-02T13:00:00Z'),
    );

    expect(actualReadings).toEqual([]);
  });

  it('test the API records are returned successfully when queried by count', async () => {
    const testResponse = {
      '@context':
        'http://environment.data.gov.uk/flood-monitoring/meta/context.jsonld',
      'meta': {
        publisher: 'Environment Agency',
      },
      'items': [
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T13-00-00Z',
          'dateTime': '2020-01-01T11:45:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.83,
        },
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T12-45-00Z',
          'dateTime': '2020-01-01T11:30:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.831,
        },
        {
          '@id':
            'http://environment.data.gov.uk/flood-monitoring/data/readings/2627-level-stage-i-15_min-mASD/2020-03-03T12-30-00Z',
          'dateTime': '2020-01-01T11:15:00Z',
          'measure':
            'http://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD',
          'value': 0.831,
        },
      ],
    };
    nock('https://environment.data.gov.uk')
      .get(
        '/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings?_sorted&_limit=3',
      )
      .reply(200, JSON.stringify(testResponse));

    const actualReadings = await target.getReadings(3);

    const expectedReadings = [
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
    ];
    expect(actualReadings).toEqual(expectedReadings);
  });
});
