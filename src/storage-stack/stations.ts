/**
 * Depths at which a ford on the river becomes unsafe to drive through, in
 * metres above stage datum (the same scale as the station's readings).
 */
export interface FordConfig {
  /** Above this depth the ford is flooded, but may still be passable. */
  floodedAboveMetres: number;
  /** Above this depth the ford is impassable. Must be above floodedAboveMetres. */
  impassableAboveMetres: number;
}

/** A river level gauge the crawler collects readings for. */
export interface StationConfig {
  /**
   * The station's key in the readings table and in SNS messages. Changing it
   * starts a new series, so keep existing IDs stable.
   */
  id: string;
  /**
   * The Environment Agency flood-monitoring measure to read, for example
   * `2627-level-stage-i-15_min-mASD`. Find one at
   * https://environment.data.gov.uk/flood-monitoring/id/stations/{station}/measures
   */
  measureId: string;
  /**
   * New readings this many metres or more above the latest stored reading are
   * treated as gauge errors and dropped. Defaults to 2.
   */
  maxDepthRiseMetres?: number;
  /**
   * The ford this gauge reports on. When set, the station's published status
   * includes whether the ford is clear, flooded or impassable.
   */
  ford?: FordConfig;
}

/** The stations the deployed crawler collects. */
export const STATIONS: StationConfig[] = [
  {
    id: 'kenilworth',
    measureId: '2627-level-stage-i-15_min-mASD',
    // Kenilworth ford (kenilworthford.com), from the original flood-readings
    // service.
    ford: { floodedAboveMetres: 1.23, impassableAboveMetres: 1.4 },
  },
];

/**
 * Checks a station list, throwing if it is empty, has duplicate IDs, or has
 * an entry with a missing field or a non-positive threshold.
 */
export function validateStations(stations: unknown): StationConfig[] {
  if (!Array.isArray(stations) || stations.length === 0) {
    throw new Error('At least one station must be configured');
  }
  const ids = new Set<string>();
  for (const station of stations as Partial<StationConfig>[]) {
    if (!station?.id || !station.measureId) {
      throw new Error(
        `Each station needs an id and a measureId: ${JSON.stringify(station)}`,
      );
    }
    if (ids.has(station.id)) {
      throw new Error(`Duplicate station id: ${station.id}`);
    }
    ids.add(station.id);
    if (
      station.maxDepthRiseMetres !== undefined &&
      !(station.maxDepthRiseMetres > 0)
    ) {
      throw new Error(
        `maxDepthRiseMetres must be greater than 0 for station ${station.id}`,
      );
    }
    if (station.ford) {
      const { floodedAboveMetres, impassableAboveMetres } = station.ford;
      if (
        !Number.isFinite(floodedAboveMetres) ||
        !Number.isFinite(impassableAboveMetres) ||
        floodedAboveMetres >= impassableAboveMetres
      ) {
        throw new Error(
          `ford.floodedAboveMetres must be below ford.impassableAboveMetres for station ${station.id}`,
        );
      }
    }
  }
  return stations as StationConfig[];
}

/** Parses and validates the crawler's STATIONS environment variable. */
export function parseStations(json: string | undefined): StationConfig[] {
  if (!json) {
    throw new Error('The STATIONS environment variable is not set');
  }
  return validateStations(JSON.parse(json));
}
