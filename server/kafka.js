/*jshint node: true */
'use strict';

const EventEmitter = require('events');
const Kafka = require('kafka-node');

const KAFKA_HOST = process.env.KAFKA_HOST;

if(!KAFKA_HOST) {
  console.log('Kafka disabled')
  module.exports = new EventEmitter();
  module.exports.disabled = true;
  return;
}

console.log(`Connecting to Kafka on ${ KAFKA_HOST }`);

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

const producer = new Kafka.Producer(client);

module.exports = producer;

producer.on('error', function (err) {
  console.error('Producer error')
  console.error(err);
});


producer.on('ready', async () => {
  // console.log('Producer ready');
});
