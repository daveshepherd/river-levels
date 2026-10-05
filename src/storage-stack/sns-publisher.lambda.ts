import {
  PublishBatchCommand,
  PublishBatchRequestEntry,
  SNSClient,
} from '@aws-sdk/client-sns';
import type {
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';

// SNS rejects PublishBatch requests with more than 10 entries
export const MAX_PUBLISH_BATCH_SIZE = 10;

const snsClient = new SNSClient({});

function toPublishEntry(record: DynamoDBRecord): PublishBatchRequestEntry {
  console.log('Stream record: ', JSON.stringify(record, null, 2));
  const message = {
    Id: `${record.dynamodb!.NewImage!.station.S}${record.dynamodb!.NewImage!
      .timestamp!.N!}`,
    Message: JSON.stringify({
      reading_depth: parseFloat(record.dynamodb!.NewImage!.reading_depth.N!),
      station: record.dynamodb!.NewImage!.station.S,
      timestamp: parseInt(record.dynamodb!.NewImage!.timestamp!.N!),
    }),
  };
  console.log('Record to publish: ', message);
  return message;
}

/**
 * Publishes inserted readings to SNS in batches of up to 10.
 *
 * Chunks are published in order. On the first failure, the sequence number of
 * the earliest unpublished record is reported back so Lambda retries from that
 * point, rather than re-publishing chunks that already succeeded.
 */
export async function handler(
  event: DynamoDBStreamEvent,
): Promise<DynamoDBBatchResponse> {
  const insertRecords = event.Records.filter(
    (record) =>
      record.eventName === 'INSERT' &&
      record.dynamodb?.NewImage?.reading_depth?.N &&
      record.dynamodb?.NewImage?.station?.S &&
      record.dynamodb?.NewImage?.timestamp?.N,
  );

  for (let i = 0; i < insertRecords.length; i += MAX_PUBLISH_BATCH_SIZE) {
    const chunk = insertRecords.slice(i, i + MAX_PUBLISH_BATCH_SIZE);
    const entries = chunk.map(toPublishEntry);

    let failedIndex: number;
    try {
      const response = await snsClient.send(
        new PublishBatchCommand({
          PublishBatchRequestEntries: entries,
          TopicArn: process.env.SNS_TOPIC_ARN,
        }),
      );
      console.log(`SNS response: ${JSON.stringify(response)}`);
      if (!response.Failed?.length) {
        continue;
      }
      const failedIds = new Set(response.Failed.map((failure) => failure.Id));
      failedIndex = entries.findIndex((entry) => failedIds.has(entry.Id));
    } catch (error) {
      console.error(`Error publishing to SNS: ${error}`);
      failedIndex = 0;
    }

    const firstFailedRecord = chunk[Math.max(failedIndex, 0)];
    return {
      batchItemFailures: [
        { itemIdentifier: firstFailedRecord.dynamodb!.SequenceNumber! },
      ],
    };
  }

  return { batchItemFailures: [] };
}
