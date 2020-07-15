/*jshint node: true */
'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/helpers/kafka_spy.js');
  return;
}

const EventEmitter = require('events');
const Kafka = require('kafka-node');

const KAFKA_HOST = process.env.KAFKA_HOST;
const KAFKA_INGRESS_TOPIC = process.env.KAFKA_INGRESS_TOPIC;

if(!KAFKA_HOST) {
  console.log('Kafka disabled')
  module.exports = new EventEmitter();
  module.exports.disabled = true;
  return;
}

if(!KAFKA_INGRESS_TOPIC) {
  throw new Error('KAFKA_INGRESS_TOPIC missing');
}

console.log(`Connecting to Kafka on ${ KAFKA_HOST } and using topic ${ KAFKA_INGRESS_TOPIC } `);

const client = new Kafka.KafkaClient({
  kafkaHost: KAFKA_HOST,
  sslOptions: {
    rejectUnauthorized: false
  },
  autoConnect: true,
  connectRetryOptions: {
    retries: 100,
    factor: 2,
    minTimeout: 1000,
    maxTimeout: 60000,
    randomize: true
  }
});


client.on("ready", function() {
  console.log("Kafka client ready");
});

client.on("error", function(err) {
  console.error('Kafka client error');
  console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  client.connect();
});

client.on("brokersChanged", function() {
  console.error('Kafka event brokersChanged')
  client.connect();
});

const producerConfig = {
  requireAcks : -1,
  ackTimeoutMs : 1000
};

const producer = new Kafka.HighLevelProducer(client, producerConfig);

module.exports = producer;


producer.on('ready', async () => {
  console.log('Kafka producer ready');
});

producer.on('error', function (err) {
  console.error('Producer error')
  console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
});


module.exports.healthcheck = function() {
  try {
    return client.ready && producer.ready;
  } catch(err) {
    console.error('Kafka healthcheck failed');
    return false;
  }
};


module.exports.deliver = async function({ id, message }) {
  const payloads = [
    {
      topic: KAFKA_INGRESS_TOPIC,
      key: id, // string or buffer, only needed when using keyed partitioner
      messages: message,
      attributes: 1 // Gzip better compression
      // attributes: 2 // Snappy - better CPU
      // timestamp
    }
  ];

  return new Promise((resolve, reject) => {
    producer.send(payloads, function (err, result) {
      if(err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};
