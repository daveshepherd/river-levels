import {
  getDirection,
  getFordState,
  getRate,
  getStationStatus,
} from '../../src/api-stack/status';

const FORD = { floodedAboveMetres: 1.23, impassableAboveMetres: 1.4 };

function readings(depths: number[], latest = '2020-01-01T15:15:00.000Z') {
  const latestTime = new Date(latest).getTime();
  return depths.map((depth, i) => ({
    date: new Date(latestTime - i * 15 * 60 * 1000),
    depth,
  }));
}

describe('getStationStatus', () => {
  // The cases from the original flood-readings service's status tests.
  const F = FORD.floodedAboveMetres;
  test.each([
    [
      'not in flood, almost no change',
      [0.745, 0.745, 0.745, 0.746, 0.746, 0.746, 0.746, 0.747, 0.747, 0.747, 0.747, 0.747],
      { direction: 'none', rate: 'none', state: 'clear' },
    ],
    [
      'not in flood, rising moderately',
      [0.789, 0.78, 0.772, 0.768, 0.767, 0.762, 0.757, 0.755, 0.753, 0.751, 0.75, 0.751],
      { direction: 'rising', rate: 'moderate', state: 'clear' },
    ],
    [
      'in flood, rising fast',
      [F + 0.028, F + 0.02, F + 0.04, F - 0.016, F - 0.049, F - 0.086, F - 0.141, F - 0.193, F - 0.211, F - 0.197, F - 0.182, F - 0.231],
      { direction: 'rising', rate: 'fast', state: 'flooded' },
    ],
    [
      'impassable, rising fast',
      [1.894, 1.877, 1.861, 1.834, 1.814, 1.793, 1.772, 1.757, 1.749, 1.739, 1.732, 1.7],
      { direction: 'rising', rate: 'fast', state: 'impassable' },
    ],
    [
      'impassable, dropping fast',
      [1.674, 1.69, 1.701, 1.72, 1.733, 1.747, 1.759, 1.771, 1.784, 1.798, 1.804, 1.823],
      { direction: 'falling', rate: 'fast', state: 'impassable' },
    ],
    [
      'impassable, dropping moderately',
      [1.856, 1.865, 1.878, 1.891, 1.901, 1.902, 1.91, 1.92, 1.927, 1.932, 1.938, 1.943],
      { direction: 'falling', rate: 'moderate', state: 'impassable' },
    ],
    [
      'clear, dropping slowly',
      [0.979, 0.982, 0.981, 0.985, 0.986, 0.987, 0.989, 0.992, 0.993, 0.996, 0.997, 1.001],
      { direction: 'falling', rate: 'slow', state: 'clear' },
    ],
  ])('that the status is correct when %s', (_, depths, expected) => {
    expect(getStationStatus(readings(depths), FORD)).toStrictEqual({
      depth: depths[0],
      ...expected,
      lastUpdate: '2020-01-01T15:15:00.000Z',
    });
  });

  test('that the ford state is omitted for a station without a ford', () => {
    const status = getStationStatus(readings([1.9, 1.8]));

    expect(status).not.toHaveProperty('state');
    expect(status).toMatchObject({ depth: 1.9, direction: 'rising' });
  });

  test('that there is no status without readings', () => {
    expect(getStationStatus([], FORD)).toBeNull();
  });

  test('that a single reading has no direction or rate', () => {
    expect(getStationStatus(readings([0.8]), FORD)).toMatchObject({
      direction: 'none',
      rate: 'none',
    });
  });
});

describe('getFordState', () => {
  test.each([
    [1.23, 'clear'],
    [1.231, 'flooded'],
    [1.4, 'flooded'],
    [1.401, 'impassable'],
  ])('that a depth of %s m is %s', (depth, state) => {
    expect(getFordState(depth, FORD)).toBe(state);
  });
});

describe('getDirection', () => {
  test('that a difference that rounds to zero is no change', () => {
    expect(getDirection([1.004, 1, 1, 1])).toBe('none');
  });

  test('that a difference of exactly -0.005 rounds away from zero, like mathjs', () => {
    // latest - mean = -0.005 with floating-point noise
    expect(getDirection([1 - (0.005 * 12) / 11, ...Array(11).fill(1)])).toBe(
      'falling',
    );
  });

  test('that no depths is no change', () => {
    expect(getDirection([])).toBe('none');
  });
});

describe('getRate', () => {
  test('that there is no rate when the direction is none', () => {
    expect(getRate([1, 2, 3], 'none')).toBe('none');
  });
});
