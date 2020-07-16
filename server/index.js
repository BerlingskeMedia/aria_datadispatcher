/*jshint node: true */
'use strict';

const Fs = require('fs');
const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Boom = require('@hapi/boom');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./sqs.js');
const NotificationsEvents = require('./notifications_events.js');


process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection');
  console.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
  process.exit(1);
});


const server = Hapi.server({
  port: process.env.PORT || 9000
});


server.register(Inert);
server.register(Scheme);
server.register(NotificationsEvents, { routes: { prefix: '/notifications_events' } });


server.route({
  method: 'GET',
  path: '/',
  handler: (request, h) => {
    return 'OK';
  }
});


server.route({
  method: 'GET',
  path: '/healthcheck',
  config: {
    auth: false,
    tags: [ 'healthcheck' ]
  },
  handler: async (request, h) => {
    if(await SQS.healthcheck() && await Kafka.healthcheck()) {
      return 'OK';
    } else {
      return Boom.badRequest();
    }
  }
});


let version = 'unknown version';

try {
  const packageJson = require('../package.json');
  version = packageJson.version;
} catch(ex) {}

try {
  const buf = Fs.readFileSync('./server/version');
  version = buf.toString();
} catch(ex) {}

console.log(`Running ${ version }`);


server.route({
  method: 'GET',
  path: '/version',
  config: {
    auth: false,
    tags: [ 'healthcheck' ]
  },
  handler: (request, h) => {
    return version;
  }
});


SQS.events.once('ready', async () => {
  console.log('SQS ready');
  if(Kafka.ready || Kafka.disabled) {
    await start();
  }  
});


Kafka.once('ready', async () => {
  console.log('Kafka ready');
  if(SQS.ready || SQS.disabled) {
    await start();
  }
});


async function start() {
  if (process.env.NODE_ENV === 'test') {
    // We are running tests.
  } else if (!server.info.started) {
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
  }
}


module.exports = server;

// I want the server to start on my local dev laptop, even though both Kafka and SQS is disabled.
if (Kafka.disabled && SQS.disabled && ['DK0000271', 'YOU CAN ADD YOUR DEV LAPTOP HOSTNAME HERE'].indexOf(server.info.host) > -1) {
  console.warn('Starting the server with all queues disabled');
  // The timeout is to make sure all plugins have registered. Easier then rewriting this into an async func.
  setTimeout(start, 2000);
}
