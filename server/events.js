'use strict';

const Boom = require('@hapi/boom');

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true');

if(CONSOLE_LOG_EVENTS) {
  console.log('Console log event has been enabled.')
}

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

        if(CONSOLE_LOG_EVENTS) {
          console.log(`Message received: ${ new Date().toISOString() }.`);
          console.log(`Content Type: ${ request.headers['content-type'] }`);
          console.log('Payload:')
          console.log(request.payload.toString());
        }

        return {
          status: `OK`
        };
      }
    });
  }
};
