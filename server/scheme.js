/*jshint node: true */
'use strict';

const DISABLE_PAYLOAD_VALIDATION = (process.env.DISABLE_PAYLOAD_VALIDATION === 'true');

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

    authenticate: async function (request, h) {

      if(!request.headers.authorization) {
        return Boom.unauthorized();
      }

      const bpc = h.bpc;
      
      if(!bpc.appTicket) {
        return Boom.badImplementation('Not connected to BPC');
      }

      let payload = {
        authorization: request.headers.authorization,
        method: request.method,
        url: request.url.href
      };
      
      if(DISABLE_PAYLOAD_VALIDATION) {
        // Do nothing
      } else {
        payload.payload = request.payload;
        payload.contentType = request.contentType;
      }

      const artifacts = await bpc.request({
        path: '/validate/credentials',
        method: 'POST',
        payload: payload
      });

      return h.authenticated({ credentials: artifacts });

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
