import {
  DynamoDBClient,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

export async function getLatestReading(station = 'kenilworth') {
  const dynamoDbClient = new DynamoDBClient({});
  const params = {
    ExpressionAttributeValues: {
      ':station': { S: station },
    },
    KeyConditionExpression: 'station = :station',
    Limit: 1,
    ScanIndexForward: false,
    TableName: process.env.DYNAMODB_READINGS_TABLE,
  };
  try {
    const queryCommand = new QueryCommand(params);
    const result = await dynamoDbClient.send(queryCommand);

    if (
      result.Items?.length === 1 &&
      result.Items[0].timestamp.N &&
      result.Items[0].reading_depth.N
    ) {
      return {
        date: new Date(parseFloat(result.Items[0].timestamp.N)),
        depth: parseFloat(result.Items[0].reading_depth.N),
      };
    }
  } catch (error) {
    console.error(
      `Error retrieving latest reading from DynamoDB table: ${error}`,
    );
    throw error;
  }
  return null;
}

async function updateReading(
  reading: { depth: number; date: Date },
  station = 'kenilworth',
) {
  const dynamoDbClient = new DynamoDBClient({});

  try {
    const updateItemCommand = new UpdateItemCommand({
      ExpressionAttributeValues: {
        ':reading_depth': { N: reading.depth.toString() },
      },
      Key: {
        station: { S: station },
        timestamp: { N: reading.date.getTime().toString() },
      },
      TableName: process.env.DYNAMODB_READINGS_TABLE,
      ReturnValues: 'ALL_NEW',
      UpdateExpression: 'SET reading_depth = :reading_depth',
    });
    await dynamoDbClient.send(updateItemCommand);
    console.log(`Reading updated: ${reading.date}: ${reading.depth}`);
  } catch (error) {
    console.error(`Error updating reading in DynamoDB table: ${error}`);
    throw error;
  }
}

export async function updateReadings(readings: any[]) {
  return Promise.all(readings.map((reading) => updateReading(reading)));
}
