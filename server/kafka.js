/*jshint node: true */
'use strict';

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/helpers/kafka_spy.js');
  return;
}

const EventEmitter = require('events');
const Kafka = require('kafka-node');
const Boom = require('@hapi/boom');

const KAFKA_HOST = process.env.KAFKA_HOST;
const KAFKA_INGRESS_TOPIC = process.env.KAFKA_INGRESS_TOPIC;

const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true');

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
  }
});

client.on("ready", function() {
  // console.log("Producer connected");
});

client.on("error", function(err) {
  console.error('Producer connection error')
  console.error(err);
});

const producerConfig = {
  requireAcks : -1,
  ackTimeoutMs : 1000
};

const producer = new Kafka.HighLevelProducer(client, producerConfig);

module.exports = producer;

producer.on('error', function (err) {
  console.error('Producer error')
  console.error(err);
});


producer.on('ready', async () => {
  // console.log('Producer ready');
});


module.exports.deliver = async function(id, payload) {
  const payloads = [
    {
      topic: KAFKA_INGRESS_TOPIC,
      // key: 'theKey', // string or buffer, only needed when using keyed partitioner
      messages: payload
    }
  ];

  producer.send(payloads, function (err, result) {
    if(err) {
      console.error('Kafka error:', err);
      throw Boom.badImplementation(err.toString());
    } else if(CONSOLE_LOG_EVENTS) {
      console.log('Kafka OK:', result)
    }
  });
};
