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

        return {
          status: `OK`
        };
      }
    });
  }
};
