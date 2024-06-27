import { SNSClient, PublishBatchCommand } from '@aws-sdk/client-sns';
import { DynamoDBStreamEvent } from 'aws-lambda';

const snsClient = new SNSClient({});

export async function handler(event: DynamoDBStreamEvent) {
  const insertRecords = event.Records.filter(
    (record) =>
      record.eventName === 'INSERT' &&
      record.dynamodb?.NewImage?.reading_depth?.N &&
      record.dynamodb?.NewImage?.station?.S &&
      record.dynamodb?.NewImage?.timestamp?.N,
  );
  if (insertRecords.length > 0) {
    const notificationMessages = insertRecords.map((record) => {
      console.log('Stream record: ', JSON.stringify(record, null, 2));
      const message = {
        Id: `${record.dynamodb!.NewImage!.station.S}${record.dynamodb!.NewImage!
          .timestamp!.N!}`,
        Message: JSON.stringify({
          reading_depth: parseFloat(
            record.dynamodb!.NewImage!.reading_depth.N!,
          ),
          station: record.dynamodb!.NewImage!.station.S,
          timestamp: parseInt(record.dynamodb!.NewImage!.timestamp!.N!),
        }),
      };
      console.log('Record to publish: ', message);
      return message;
    });
    const publishBatchCommand = new PublishBatchCommand({
      PublishBatchRequestEntries: notificationMessages,
      TopicArn: process.env.SNS_TOPIC_ARN,
    });
    const response = await snsClient.send(publishBatchCommand);
    console.log(`SNS response: ${JSON.stringify(response)}`);
  }
}
