/*jshint node: true */
'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/helpers/aws_sqs_spy.js');
  return;
}

const EventEmitter = require('events');
const AWS = require('aws-sdk');
const Boom = require('@hapi/boom');

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const SQS_MESSAGE_GROUP_ID = process.env.SQS_MESSAGE_GROUP_ID || 'aria';


AWS.config.update({accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, region: AWS_REGION});

const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true');

const sqs = new AWS.SQS();

module.exports = sqs;

module.exports.ready = false;
module.exports.events = new EventEmitter();


if(!SQS_QUEUE_URL) {
  console.log('SQS disabled')
  module.exports.disabled = true;
  return;
}

console.log(`Connecting to SQS on ${ SQS_QUEUE_URL } on message group ${ SQS_MESSAGE_GROUP_ID } using AWS_ACCESS_KEY_ID ${ AWS_ACCESS_KEY_ID }`);


// Verify we have a Fifo queue
const params = {
  QueueUrl: SQS_QUEUE_URL,
  AttributeNames: [
    // All | Policy | VisibilityTimeout | MaximumMessageSize | MessageRetentionPeriod | ApproximateNumberOfMessages | ApproximateNumberOfMessagesNotVisible | CreatedTimestamp | LastModifiedTimestamp | QueueArn | ApproximateNumberOfMessagesDelayed | DelaySeconds | ReceiveMessageWaitTimeSeconds | RedrivePolicy | FifoQueue | ContentBasedDeduplication | KmsMasterKeyId | KmsDataKeyReusePeriodSeconds,
    'FifoQueue'
    /* more items */
  ]
};

sqs.getQueueAttributes(params, function(err, data) {
  if (err) {
    console.error(err, err.stack); // an error occurred
  } else {
    // console.log(data);           // successful response
    if(data.Attributes.FifoQueue === 'true') {
      module.exports.ready = true;
      module.exports.events.emit('ready');
    } else {
      throw new Error('SQS queue is not Fifo');
    }
  }
});


module.exports.deliver = async function(id, payload) {
  var sqsParams = {
    MessageBody: payload,
    MessageDeduplicationId: id.toString(),
    MessageGroupId: SQS_MESSAGE_GROUP_ID,
    // MessageAttributes,
    QueueUrl: SQS_QUEUE_URL
  };

  sqs.sendMessage(sqsParams, function(err, result) {
    if (err) {
      console.error('SQS Error:', err);
      throw Boom.badImplementation(err.toString());
    } else if(CONSOLE_LOG_EVENTS) {
      console.log('SQS OK:', JSON.stringify(result));
    }
  });
};
