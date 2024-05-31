import axios from 'axios';

function mapResults(results: any) {
  return results.items.map((reading: { dateTime: number; value: number }) => ({
    date: new Date(reading.dateTime),
    depth: reading.value,
  }));
}

export async function getReadings(limit: number) {
  let response;
  try {
    const url = `https://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings?_sorted&_limit=${limit}`;
    console.log(`Requesting readings from ${url}`);
    response = await axios.get(url);
  } catch (error) {
    console.error(
      `Error retrieving readings from flood API: ${JSON.stringify(error)}`,
    );
    throw error;
  }
  return mapResults(response.data);
}

export async function getReadingsSince(queryDate = new Date()) {
  const dateString = queryDate.toISOString();
  let response;
  try {
    const url = `https://environment.data.gov.uk/flood-monitoring/id/measures/2627-level-stage-i-15_min-mASD/readings?_sorted&since=${dateString}`;
    console.log(`Requesting readings from ${url}`);
    response = await axios.get(url);
  } catch (error) {
    console.error(
      `Error retrieving readings from flood API: ${JSON.stringify(error)}`,
    );
    throw error;
  }
  console.log(typeof response.data);
  return mapResults(response.data);
}
