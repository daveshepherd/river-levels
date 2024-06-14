"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/storage-stack/sns-publisher.lambda.ts
var sns_publisher_lambda_exports = {};
__export(sns_publisher_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(sns_publisher_lambda_exports);
var import_client_sns = require("@aws-sdk/client-sns");
var snsClient = new import_client_sns.SNSClient({});
async function handler(event) {
  event.Records.forEach(async (record) => {
    console.log("Stream record: ", JSON.stringify(record, null, 2));
    if (record.eventName === "INSERT") {
      const message = {
        reading_depth: parseFloat(record.dynamodb.NewImage.reading_depth.N),
        station: record.dynamodb.NewImage.station.S,
        timestamp: parseInt(record.dynamodb.NewImage.timestamp.N)
      };
      const publishCommand = new import_client_sns.PublishCommand({
        Message: JSON.stringify(message),
        TopicArn: process.env.SNS_TOPIC_ARN
      });
      await snsClient.send(publishCommand);
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
