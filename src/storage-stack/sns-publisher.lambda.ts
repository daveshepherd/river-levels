import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import {
  PublishBatchCommand,
  PublishBatchRequestEntry,
  SNSClient,
} from '@aws-sdk/client-sns';
import type {
  Context,
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';

// SNS rejects PublishBatch requests with more than 10 entries
export const MAX_PUBLISH_BATCH_SIZE = 10;

const logger = new Logger({ serviceName: 'sns-publisher' });
const tracer = new Tracer({ serviceName: 'sns-publisher' });

// Created once per Lambda container and reused across invocations.
const snsClient = tracer.captureAWSv3Client(new SNSClient({}));

function toPublishEntry(record: DynamoDBRecord): PublishBatchRequestEntry {
  return {
    Id: `${record.dynamodb!.NewImage!.station.S}${record.dynamodb!.NewImage!
      .timestamp!.N!}`,
    Message: JSON.stringify({
      reading_depth: Number.parseFloat(record.dynamodb!.NewImage!.reading_depth.N!),
      station: record.dynamodb!.NewImage!.station.S,
      timestamp: Number.parseInt(record.dynamodb!.NewImage!.timestamp!.N!),
    }),
  };
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
  context?: Context,
): Promise<DynamoDBBatchResponse> {
  if (context) {
    logger.addContext(context);
  }
  const insertRecords = event.Records.filter(
    (record) =>
      record.eventName === 'INSERT' &&
      record.dynamodb?.NewImage?.reading_depth?.N &&
      record.dynamodb?.NewImage?.station?.S &&
      record.dynamodb?.NewImage?.timestamp?.N,
  );
  logger.info('Received stream batch', {
    records: event.Records.length,
    inserts: insertRecords.length,
  });

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
      if (!response.Failed?.length) {
        logger.info('Published readings', { count: entries.length });
        continue;
      }
      logger.error('SNS rejected some readings', {
        published: response.Successful?.length ?? 0,
        failed: response.Failed,
      });
      const failedIds = new Set(response.Failed.map((failure) => failure.Id));
      failedIndex = entries.findIndex((entry) => failedIds.has(entry.Id));
    } catch (error) {
      logger.error('Error publishing to SNS', {
        count: entries.length,
        error: error as Error,
      });
      failedIndex = 0;
    }

    const firstFailedRecord = chunk[Math.max(failedIndex, 0)];
    logger.warn('Retrying from the first unpublished record', {
      sequenceNumber: firstFailedRecord.dynamodb!.SequenceNumber,
      unpublished: insertRecords.length - i - Math.max(failedIndex, 0),
    });
    return {
      batchItemFailures: [
        { itemIdentifier: firstFailedRecord.dynamodb!.SequenceNumber! },
      ],
    };
  }

  return { batchItemFailures: [] };
}
