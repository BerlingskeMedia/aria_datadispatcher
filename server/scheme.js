/*jshint node: true */
'use strict';


// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_PAYLOAD_VALIDATION = (process.env.DISABLE_PAYLOAD_VALIDATION === 'true');

if(DISABLE_PAYLOAD_VALIDATION) {
  console.warn('Warning: Payload validation has been disabled.')
}

if (process.env.NODE_ENV === 'test') {
  module.exports = require('../test/bpc_stub.js');
  return;
}

const Boom = require('@hapi/boom');
const BpcClient = require('bpc_client');

BpcClient.events.on('ready', async () => {
  console.log('Connected to BPC');
});

const scheme = function (server, options) {

  return {

    options: {
      // This will trigger the "payload" async auth function
      payload: !DISABLE_PAYLOAD_VALIDATION
    },

    authenticate: async function (request, h) {

      if(!request.headers.authorization) {
        return Boom.unauthorized();
      }

      if(!h.bpc.appTicket) {
        return Boom.badImplementation('Not connected to BPC');
      }

      
      // Payload data in "request.payload" is not available in the "authenticate" function.
      // So in case payload validation is enabled, then we must wait with validation until "payload" function.
      // Otherwise two requests to BPC will be made.

      if(DISABLE_PAYLOAD_VALIDATION) {
        
        const payload = {
          authorization: request.headers.authorization,
          method: request.method,
          url: request.url.href
        };
        
        const artifacts = await h.bpc.request({
          path: '/validate/credentials',
          method: 'POST',
          payload: payload
        });
        
        return h.authenticated({ credentials: artifacts });

      } else {

        // Because payload validation has been enabled, the auth scheme will proceed to the "payload" async auth function 
        return h.authenticated({ credentials: {} });
      }
    },
      
    payload: async function (request, h) {

      // This function will only be executed if the "options.payload" is set to true.

      const payload = {
        authorization: request.headers.authorization,
        method: request.method,
        url: request.url.href,
        payload: request.payload.toString(),
        contentType: request.headers['content-type']
      };

      await h.bpc.request({
        path: '/validate/credentials',
        method: 'POST',
        payload: payload
      });

      return h.continue;
    }
  };
};


module.exports = {
  name: 'scheme',
  version: '1.0.0',
  register(server, options) {
      BpcClient.connect();
      server.auth.scheme('bpc', scheme);
      server.auth.strategy('bpc', 'bpc');
      server.decorate('toolkit', 'bpc', BpcClient);
  }
};
