import { Tracer } from '@aws-lambda-powertools/tracer';

import * as floodApi from './flood-api-client/readings';
import * as readingStore from './store/readings';

const tracer = new Tracer({ serviceName: 'crawler' });

export async function handler() {
  const segment = tracer.getSegment();
  console.log('Running function');

  const getLatestReadingSubsegment =
    segment!.addNewSubsegment('get latest reading');
  const lastRecordedReading = await readingStore.getLatestReading();
  getLatestReadingSubsegment.close();

  console.log(
    `Latest reading date: ${
      lastRecordedReading ? lastRecordedReading.date : 'none'
    }`,
  );
  const oldestDateLookup = new Date();
  oldestDateLookup.setDate(oldestDateLookup.getDate() - 7);
  let newReadings;
  if (
    typeof lastRecordedReading !== 'undefined' &&
    lastRecordedReading !== null &&
    lastRecordedReading.date.getTime() >= oldestDateLookup.getTime()
  ) {
    console.log('Getting latest readings');
    const getReadingsSinceSubsegment =
      segment!.addNewSubsegment('get readings since');
    newReadings = await floodApi.getReadingsSince(lastRecordedReading.date);
    getReadingsSinceSubsegment.close();
  } else {
    console.log('There are no recent readings in the database');
    const getReadingsLimitSubsegment =
      segment!.addNewSubsegment('get readings limit');
    newReadings = await floodApi.getReadings(96);
    getReadingsLimitSubsegment.close();
  }

  console.log(`Retrieved readings: ${JSON.stringify(newReadings)}`);

  if (
    newReadings.length >= 1 &&
    lastRecordedReading &&
    lastRecordedReading.date.getTime() >
      newReadings[newReadings.length - 1].date.getTime() - 3600000
  ) {
    newReadings = newReadings.filter(
      (element: { depth: number }) =>
        element.depth < lastRecordedReading.depth + 2,
    );
  }

  const updateReadingsSubsegment = segment!.addNewSubsegment('update readings');
  await readingStore.updateReadings(newReadings);
  updateReadingsSubsegment.close();
}
