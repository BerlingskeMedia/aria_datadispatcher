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
          // parse: false
        }
      },
      handler: async (request, h) => {

        console.log('Message recieved');
        return {
          status: `Message recieved`
        };
      }
    });
  }
};
