/*jshint node: true */
'use strict';

const Fs = require('fs');
const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./sqs.js');
const NotificationsEvents = require('./notifications_events.js');

// To print the event payload details to console log, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true' && process.env.NODE_ENV !== 'test');

process.on('unhandledRejection', (err) => {
  console.error('unhandledRejection');
  console.error(err);
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
  handler: (request, h) => {
    return 'OK';
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

const Good = require('@hapi/good');
const goodOptions = {
  reporters: {
    myConsoleReporter: [
      { module: '@hapi/good-squeeze',
        name: 'Squeeze',
        args: [
          {
            log: '*',
            response: {
              exclude: 'healthcheck',
              include: 'notifications'
            }
          }
        ]
      },
      { module: '@hapi/good-console' },
      'stdout'
    ]
  }
};


async function start() {
  if (process.env.NODE_ENV === 'test') {
    // We are running tests.
  } else if (!server.info.started) {
    // If we console.log all event data, no need to also log the HTTP-requests
    if(!CONSOLE_LOG_EVENTS) {
      await server.register({ plugin: Good, options: goodOptions });
    }
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
