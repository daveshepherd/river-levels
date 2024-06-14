import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { DynamoDBStreamEvent } from 'aws-lambda';

const snsClient = new SNSClient({});

export async function handler(event: DynamoDBStreamEvent) {
  event.Records.forEach(async (record: any) => {
    console.log('Stream record: ', JSON.stringify(record, null, 2));
    if (record.eventName === 'INSERT') {
      const message = {
        reading_depth: parseFloat(record.dynamodb.NewImage.reading_depth.N),
        station: record.dynamodb.NewImage.station.S,
        timestamp: parseInt(record.dynamodb.NewImage.timestamp.N),
      };
      const publishCommand = new PublishCommand({
        Message: JSON.stringify(message),
        TopicArn: process.env.SNS_TOPIC_ARN,
      });
      await snsClient.send(publishCommand);
    }
  });
}
