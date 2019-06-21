/*jshint node: true */
'use strict';

const Hapi = require('@hapi/hapi');
const BpcClient = require('bpc_client');
const NotificationsEvents = require('./notifications_events.js')
const Scheme = require('./scheme.js')


process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

const server = Hapi.server({
  port: process.env.PORT || 9000
});

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
  handler: (request, h) => {
      return 'OK';
  }
});

BpcClient.events.on('ready', async () => {
  if (process.env.NODE_ENV === 'test') {
    // We are running tests.
  } else {
    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
  }
});

module.exports = server;
