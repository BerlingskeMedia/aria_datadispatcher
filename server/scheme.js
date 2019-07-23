/*jshint node: true */
'use strict';

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true');

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_PAYLOAD_VALIDATION = (process.env.DISABLE_PAYLOAD_VALIDATION === 'true');

const crypto = require('crypto');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');


if(DISABLE_PAYLOAD_VALIDATION) {
  console.warn('Warning: Payload validation has been disabled.')
}


if(DISABLE_VALIDATION) {
  console.warn('Warning: ALL validation has been disabled.')
}


const msgAuthDetailsValidation = Joi.object().keys({
  clientNo: Joi.number().integer().required(),
  requestDateTime: Joi.string().required(),
  signatureVersion: Joi.number().integer(),
  ariaAccountID: Joi.string().required(),
  ariaAccountNo: Joi.number().integer().required(),
  userID: Joi.string().default(''),
  message: Joi.string().default('')
}).unknown(true); // Allow and strip unknows parameters


// Must return:
//    clientNo|requestDateTime|accountID|accountNo|userID|authKey
const concatMsgAuthDetails = function(input, authKey) {

  const validateResult = msgAuthDetailsValidation.validate(input);
  if(validateResult.error) {
    throw Boom.badRequest();
  }

  let temp;
  
  if(input.message) {

    temp = [
      input.clientNo,
      input.requestDateTime,
      input.ariaAccountID,
      input.ariaAccountNo,
      input.userID,
      input.message,
      authKey
    ];

  } else {

    temp = [
      input.clientNo,
      input.requestDateTime,
      input.ariaAccountID,
      input.ariaAccountNo,
      input.userID,
      authKey
    ];

  }

  const concatValue = temp.join('|');
  return concatValue;
};


const calculateSignatureValue = function(input) {
  const sha256 = crypto.createHash('sha256').update(input, 'utf16le').digest();
  const base64 = Buffer.from(sha256).toString('base64');
  return base64;
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

      // 
      const ARIA_CLIENT_NO = process.env.ARIA_CLIENT_NO;
      const ARIA_AUTH_KEY = process.env.ARIA_AUTH_KEY;

      
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
