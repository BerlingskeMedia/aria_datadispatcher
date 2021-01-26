/*jshint node: true */
'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/helpers/kafka_spy.js');
  return;
}

const EventEmitter = require('events');
const { Kafka, logLevel, CompressionTypes } = require('kafkajs');

const KAFKA_BROKERS = process.env.KAFKA_HOST;
const KAFKA_INGRESS_TOPIC = process.env.KAFKA_INGRESS_TOPIC;

if(!KAFKA_BROKERS) {
  console.log('Kafka disabled')
  module.exports = new EventEmitter();
  module.exports.disabled = true;
  return;
}

if(!KAFKA_INGRESS_TOPIC) {
  throw new Error('KAFKA_INGRESS_TOPIC missing');
}

console.log(`Connecting to Kafkajs on ${ KAFKA_BROKERS } and using topic ${ KAFKA_INGRESS_TOPIC } `);

let kafkaConfig = {
  clientId: 'aria_datadispatcher',
  brokers: KAFKA_BROKERS.split(','),
  retry: {
    initialRetryTime: 1000,
    maxRetryTime: 60000,
    factor: 2,
    retries: 200
  },
  logLevel: logLevel.ERROR,
};

if (process.env.NODE_ENV !== 'development') {
  kafkaConfig = {...kafkaConfig, ...{ssl: {rejectUnauthorized: false}}}
}

const client = new Kafka(kafkaConfig)

const producer = client.producer();
producer.ready = false;

producer.on('producer.connect', async () => {
  producer.ready = true;
  console.log('[kafka/producer] ready');
});
producer.on('producer.disconnect', async () => {
  producer.ready = false;
  console.log('[kafka/producer] disconnected');
});
producer.on('producer.network.request_timeout', async () => {
  console.log('[kafka/producer] Request to a broker has timed out.');
});

producer.connect();

module.exports = producer;

module.exports.healthcheck = function() {
  try {
    return producer.ready;
  } catch(err) {
    console.error('Kafka healthcheck failed');
    return false;
  }
};

module.exports.deliver = async function({ id, message }) {
  return await producer.send({
      topic: KAFKA_INGRESS_TOPIC,
      messages: [
        { key: id, value: message}
      ],
      compression: CompressionTypes.GZIP,
      acks: 0,
      timeout: 1000,
    });
};

module.exports.disconnect = async function () {
  await producer.disconnect()
}
