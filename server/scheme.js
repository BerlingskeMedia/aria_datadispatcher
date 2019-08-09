/*jshint node: true */
'use strict';


const crypto = require('crypto');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');


// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true');

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
const concatMsgAuthDetails = function(msgAuthDetails, message) {

  const ARIA_CLIENT_NO = process.env.ARIA_CLIENT_NO;
  const ARIA_AUTH_KEY = process.env.ARIA_AUTH_KEY;

  if(!ARIA_AUTH_KEY) {
    console.error('Environment variable ARIA_AUTH_KEY missing')
    throw Boom.unauthorized();
  }

  if(!msgAuthDetails) {
    throw Boom.unauthorized();
  }

  const validateResult = msgAuthDetailsValidation.validate(msgAuthDetails);
  if(validateResult.error) {
    throw Boom.unauthorized();
  }


  let fields = [
    msgAuthDetails.clientNo,
    msgAuthDetails.requestDateTime,
    msgAuthDetails.ariaAccountID,
    msgAuthDetails.ariaAccountNo,
    msgAuthDetails.userID,
    ARIA_AUTH_KEY
  ];

  
  if(msgAuthDetails.signatureVersion !== 1) {

    // let message = stringifyWithFloats(eventData);
    // let message = JSON.stringify(eventData);
    // Aria workflow calculated the hash without the backslash escapes
    message = message.replace(/\\/g, '');
    // Adding the message on the fifth position in the fields array
    fields.splice(5, 0, message);
  }

  const concatValue = fields.join('|');
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
      // Do NOT set to false, otherwise authentication is practially disabled
      payload: !DISABLE_VALIDATION
    },


    authenticate: async function (request, h) {
      // In this "authenticate" function, payload data (in "request.payload") is not yet available.
      // So we need to return "h.authenticated" in order to proceed to the "payload" function
      return h.authenticated({ credentials: {} });
    },


    // This function will only be executed if this scheme "options.payload" is set to true.
    payload: async function (request, h) {

      if(!request.payload) {
        throw Boom.unauthorized();
      }

      const originalPayload = request.payload.toString();
      
      if(!originalPayload) {
        throw Boom.unauthorized();
      }

      let parsedPayload;

      try {
        parsedPayload = JSON.parse(originalPayload);
      } catch(ex) {
        console.error(ex);
        throw Boom.unauthorized();
      }


      const splitString = '"eventData":{';
      const eventDataIndex = originalPayload.indexOf(splitString);
      // Getting the content of eventData
      const strippedEventData = originalPayload.substring(eventDataIndex + splitString.length - 1, originalPayload.length - 1 );


      // Store the original request string
      // try to parse JSON
      // Validate that there is both msgAuthDetails and eventData
      // get the msgAuthDetails object
      // if the
      // isolate the eventData


      const input = concatMsgAuthDetails(parsedPayload.msgAuthDetails, strippedEventData);
      const hash = calculateSignatureValue(input);

      if(hash === parsedPayload.msgAuthDetails.signatureValue) {
        return h.continue;
      } else {
        throw Boom.unauthorized();
      }
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
  concatMsgAuthDetails,
  calculateSignatureValue,
  msgAuthDetailsValidation
};
