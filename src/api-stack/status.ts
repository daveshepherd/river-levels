import type { FordConfig } from '../storage-stack/stations';

/** How many of the latest readings the status is worked out from: 3 hours of 15-minute readings. */
export const STATUS_READINGS = 12;

export type FordState = 'clear' | 'flooded' | 'impassable';
export type Direction = 'rising' | 'falling' | 'none';
export type Rate = 'none' | 'slow' | 'moderate' | 'fast';

/**
 * The published status of a station, in the shape the kenilworthford.com
 * website reads from `/status`.
 */
export interface StationStatus {
  /** The latest depth, in metres above stage datum. */
  depth: number;
  direction: Direction;
  rate: Rate;
  /** Only present for stations with a ford. */
  state?: FordState;
  /** When the latest reading was taken, as an ISO 8601 string. */
  lastUpdate: string;
}

/**
 * Rounds to 2 decimal places, half away from zero, like mathjs `round(x, 2)`.
 * Like mathjs, it first snaps the value to 12 decimal places, so
 * floating-point noise such as -0.0049999999999999 rounds as -0.005.
 */
function roundTo2(value: number) {
  const snapped = Number(value.toFixed(12));
  const scaled = Number((Math.abs(snapped) * 100).toPrecision(15));
  return (Math.sign(snapped) * Math.round(scaled)) / 100;
}

/** Sample standard deviation (N - 1), like mathjs `std`. */
function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

/** Whether a ford is passable at a depth. Depths exactly on a threshold count as the lower state. */
export function getFordState(depth: number, ford: FordConfig): FordState {
  if (depth > ford.impassableAboveMetres) {
    return 'impassable';
  }
  if (depth > ford.floodedAboveMetres) {
    return 'flooded';
  }
  return 'clear';
}

/**
 * Whether the river is rising or falling: the latest depth compared with the
 * mean of the recent depths, to 2 decimal places. `depths` is newest first.
 */
export function getDirection(depths: number[]): Direction {
  if (depths.length === 0) {
    return 'none';
  }
  const mean = depths.reduce((a, b) => a + b, 0) / depths.length;
  const difference = roundTo2(depths[0] - mean);
  if (difference > 0) {
    return 'rising';
  }
  if (difference < 0) {
    return 'falling';
  }
  return 'none';
}

/** How fast the river is changing, from the spread of the recent depths. */
export function getRate(depths: number[], direction: Direction): Rate {
  if (direction === 'none') {
    return 'none';
  }
  const spread = standardDeviation(depths);
  if (spread <= 0.01) {
    return 'slow';
  }
  if (spread <= 0.03) {
    return 'moderate';
  }
  return 'fast';
}

/**
 * Works out a station's status from its latest readings, newest first.
 * Returns null when there are no readings.
 */
export function getStationStatus(
  readings: Array<{ date: Date; depth: number }>,
  ford?: FordConfig,
): StationStatus | null {
  if (readings.length === 0) {
    return null;
  }
  const depths = readings.map((reading) => reading.depth);
  const direction = getDirection(depths);
  return {
    depth: depths[0],
    direction,
    rate: getRate(depths, direction),
    ...(ford ? { state: getFordState(depths[0], ford) } : {}),
    lastUpdate: readings[0].date.toISOString(),
  };
}
