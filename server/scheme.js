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


const ARIA_CLIENT_NO = process.env.ARIA_CLIENT_NO;
const ARIA_AUTH_KEY = process.env.ARIA_AUTH_KEY;


const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');


const msgAuthDetailsValidation = Joi.object().keys({
  clientNo: Joi.number().integer(),
  requestDateTime: Joi.string(),
  signatureVersion: Joi.number().integer(),
  ariaAccountID: Joi.string(),
  ariaAccountNo: Joi.number().integer(),
  userID: Joi.string()
}).unknown(true); // Allow and strip unknows parameters


// Must return:
//    clientNo|requestDateTime|accountID|accountNo|userID|authKey
const concatMsgAuthDetails = function(input) {

  const validateResult = msgAuthDetailsValidation.validate(input);
  if(validateResult.error) {
    throw Boom.badRequest();
  }

  const temp = [
    input.clientNo,
    input.requestDateTime,
    input.ariaAccountID,
    input.ariaAccountNo,
    input.userID,
    ARIA_AUTH_KEY
  ];

  return temp.join('|');
};


const calculateSignatureValue = function(input) {
  return '00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=';
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
