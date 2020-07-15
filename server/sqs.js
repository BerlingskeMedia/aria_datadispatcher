/*jshint node: true */
'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/helpers/sqs_spy.js');
  return;
}

const EventEmitter = require('events');
const AWS = require('aws-sdk');

const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;
const SQS_MESSAGE_GROUP_ID = process.env.SQS_MESSAGE_GROUP_ID || 'aria';


AWS.config.update({accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY, region: AWS_REGION});

const sqs = new AWS.SQS();

module.exports = sqs;

module.exports.ready = false;
module.exports.events = new EventEmitter();


if(!SQS_QUEUE_URL) {
  console.log('SQS disabled')
  module.exports.disabled = true;
  return;
}

const isFifoQueueUrl = SQS_QUEUE_URL.endsWith('.fifo');

let Attributes;

if(isFifoQueueUrl) {
  console.log(`Connecting to SQS on ${ SQS_QUEUE_URL } on message group ${ SQS_MESSAGE_GROUP_ID } using AWS_ACCESS_KEY_ID ${ AWS_ACCESS_KEY_ID }`);
} else {
  console.log(`Using SQS queue ${SQS_QUEUE_URL}`);
}

async function getQueueAttributes() {

  // All | Policy | VisibilityTimeout | MaximumMessageSize | MessageRetentionPeriod | ApproximateNumberOfMessages | ApproximateNumberOfMessagesNotVisible | CreatedTimestamp | LastModifiedTimestamp | QueueArn | ApproximateNumberOfMessagesDelayed | DelaySeconds | ReceiveMessageWaitTimeSeconds | RedrivePolicy | FifoQueue | ContentBasedDeduplication | KmsMasterKeyId | KmsDataKeyReusePeriodSeconds,
  let AttributeNames = [ 'MaximumMessageSize' ];

  if(isFifoQueueUrl) {
    AttributeNames.push('FifoQueue');
  }
  
  const params = {
    QueueUrl: SQS_QUEUE_URL,
    AttributeNames
  };
  
  return new Promise((resolve, reject) => {
    sqs.getQueueAttributes(params, function(err, data) {

      Attributes = data.Attributes;

      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}


async function ready() {
  try {
    await getQueueAttributes();
    module.exports.ready = true;
    module.exports.events.emit('ready');
  } catch(err) {
    console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  }
}


ready();


module.exports.healthcheck = async function() {
  try {
    await getQueueAttributes();
    return true;
  } catch(err) {
    console.error('SQS healthcheck failed');
    return false;
  }
};


module.exports.deliver = async function({ id, message }) {

  if(Attributes.MaximumMessageSize) {
    // Results in NaN if not a valid number.
    const MaximumMessageSize = parseInt(Attributes.MaximumMessageSize);
    const MessageSize = Buffer.byteLength(message);
    if(MessageSize > MaximumMessageSize) {
      // Resolve, and not Reject, because this should not trigger an Error response to Aria.
      console.error(`SQS:message:MaximumMessageSize exceeded`);
      return Promise.resolve('MaximumMessageSize exceeded');
    }
  }


  const sqsParams = {
    MessageBody: message,
    QueueUrl: SQS_QUEUE_URL
  };

  if(isFifoQueueUrl) {
    sqsParams.MessageDeduplicationId = id;
    sqsParams.MessageGroupId = SQS_MESSAGE_GROUP_ID;
  }

  return new Promise((resolve, reject) => {
    sqs.sendMessage(sqsParams, function(err, result) {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
