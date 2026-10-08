import {
  parseStations,
  STATIONS,
  validateStations,
} from '../../src/storage-stack/stations';

describe('stations', () => {
  test('that the deployed station list is valid', () => {
    expect(validateStations(STATIONS)).toBe(STATIONS);
  });

  test('that Kenilworth keeps its existing id and measure', () => {
    expect(STATIONS).toContainEqual({
      id: 'kenilworth',
      measureId: '2627-level-stage-i-15_min-mASD',
    });
  });

  test.each([
    ['an empty list', [], 'At least one station must be configured'],
    ['a non-array', { id: 'a' }, 'At least one station must be configured'],
    ['a missing measureId', [{ id: 'a' }], 'Each station needs an id and a measureId'],
    ['a missing id', [{ measureId: 'm' }], 'Each station needs an id and a measureId'],
    [
      'duplicate ids',
      [
        { id: 'a', measureId: 'm1' },
        { id: 'a', measureId: 'm2' },
      ],
      'Duplicate station id: a',
    ],
    [
      'a zero threshold',
      [{ id: 'a', measureId: 'm', maxDepthRiseMetres: 0 }],
      'maxDepthRiseMetres must be greater than 0 for station a',
    ],
  ])('that it rejects %s', (_, stations, message) => {
    expect(() => validateStations(stations)).toThrow(message);
  });

  test('that it parses a JSON station list', () => {
    const stations = [{ id: 'a', measureId: 'm', maxDepthRiseMetres: 1.5 }];
    expect(parseStations(JSON.stringify(stations))).toEqual(stations);
  });

  test('that it rejects a missing STATIONS value', () => {
    expect(() => parseStations(undefined)).toThrow(
      'The STATIONS environment variable is not set',
    );
  });
});
