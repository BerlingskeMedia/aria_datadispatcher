/*jshint node: true */
'use strict';

const Hapi = require('@hapi/hapi');
const Events = require('./events.js')
const Scheme = require('./scheme.js')


process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

const server = Hapi.server({
  port: 3000,
  host: 'localhost'
});

server.register(Scheme);
server.register(Events, { routes: { prefix: '/events' } });

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

if (process.env.NODE_ENV === 'test') {
  // We are running tests.
} else {
  await server.start();
  console.log(`Server running at: ${server.info.uri}`);
}

module.exports = server;
