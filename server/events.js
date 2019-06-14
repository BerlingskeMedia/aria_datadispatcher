'use strict';

const Boom = require('@hapi/boom');

module.exports = {
  name: 'events',
  version: '1.0.0',
  register: async (server, options) => {

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: 'bpc',
        payload: {
          parse: false,
          allow: ['text/xml', 'text/plain', 'application/xml', 'application/json']
        }
      },
      handler: async (request, h) => {

        console.log(`Message received: ${ new Date().toISOString() }.`);
        console.log(`Content Type: ${ request.headers['content-type'] }`);
        console.log('Payload:')
        console.log(request.payload.toString());

        return {
          status: `OK`
        };
      }
    });
  }
};
