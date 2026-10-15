/** The S3 keys a station's files are published to. */
export function stationKeys(stationId: string) {
  return {
    status: `stations/${stationId}/status.json`,
    chart: `stations/${stationId}/chart.json`,
  };
}
