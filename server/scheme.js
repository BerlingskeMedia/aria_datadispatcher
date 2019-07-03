/*jshint node: true */
'use strict';

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true');

if(DISABLE_VALIDATION) {
  console.warn('Warning: ALL validation has been disabled.')
}

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_PAYLOAD_VALIDATION = (process.env.DISABLE_PAYLOAD_VALIDATION === 'true');

if(DISABLE_PAYLOAD_VALIDATION) {
  console.warn('Warning: Payload validation has been disabled.')
}

const Boom = require('@hapi/boom');


const concatMsgAuthDetails = function(input) {
  return '40|2019-03-26T08:24:00Z|xyz|0|abc|ASDvwHnQtaD6KyVuMGgVFGE8tukXaTkE';
};


const calculateSignatureValue = function(input) {
  return 'asdjkfq35ascas5q4wq09fq34racndsca';
};


const scheme = function (server, options) {

  return {

    options: {
      // This will trigger the "payload" async auth function
      payload: !DISABLE_PAYLOAD_VALIDATION
    },

    authenticate: async function (request, h) {

      if(DISABLE_VALIDATION) {
        return h.authenticated({ credentials: {} });
      }

      
      // Payload data in "request.payload" is not available in the "authenticate" function.
      // So in case payload validation is enabled, then we must wait with validation until "payload" function.
      // Otherwise two requests to BPC will be made.

      if(DISABLE_PAYLOAD_VALIDATION) {
        
        // TODO
        
        return h.authenticated({ credentials: {} });

      } else {

        // Because payload validation has been enabled, the auth scheme will proceed to the "payload" async auth function 
        return h.authenticated({ credentials: {} });
      }
    },
      
    payload: async function (request, h) {

      // This function will only be executed if this scheme "options.payload" is set to true.

      return h.continue;
    }
  };
};


module.exports = {
  name: 'scheme',
  version: '1.0.0',
  register(server, options) {
    server.auth.scheme('aria', scheme);
    server.auth.strategy('aria', 'aria');
  },
  concatMsgAuthDetails: concatMsgAuthDetails,
  calculateSignatureValue: calculateSignatureValue
};
