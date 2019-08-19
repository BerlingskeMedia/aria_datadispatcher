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


const isolateEventPayload = function(payload) {
  const splitString = '"eventPayload":';

  const eventPayloadIndex = payload.indexOf(splitString);

  if(eventPayloadIndex === -1) {
    // In case there is no 
    return payload;
  }
  
  const startOfObject = eventPayloadIndex + splitString.length;
  const halfWayEventPayloadStr = payload.substring(startOfObject);
  const endOfObject = findEndOfObject(halfWayEventPayloadStr);
  const eventPayloadStr = halfWayEventPayloadStr.substring(0, endOfObject);
  return eventPayloadStr;
};


const findEndOfObject = function(input, position = 0, bracketCounter = 0) {
  if(input.length === 0) {
    return position;
  }

  if(position > 0 && bracketCounter === 0) {
    return position;
  }

  const nextOpen = input.indexOf('{', position);
  const nextClose = input.indexOf('}', position);
  
  if (nextOpen === -1 && nextClose === -1) {
    // There is no open nor close brackets
    // We return the last postion
    return input.length - 1;

  } else if(nextOpen === -1 || nextOpen > nextClose) {
    // There is no open but close brackets, or
    // the next bracket is a close
    return findEndOfObject(input, nextClose + 1, bracketCounter += -1);

  } else if(nextClose === -1 || nextOpen < nextClose) {
    // There is an open but no close brackets, or
    // the next bracket is an open
    return findEndOfObject(input, nextOpen + 1, bracketCounter += 1);
  }

  throw new Error('Exception');

};


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

      const eventPayload = isolateEventPayload(originalPayload);


      let msgAuthDetails = {};

      try {
        const parsedPayload = JSON.parse(originalPayload);
        if(parsedPayload.msgAuthDetails) {
          msgAuthDetails = parsedPayload.msgAuthDetails
        }
      } catch(ex) {
        console.error(ex);
        throw Boom.unauthorized();
      }

      // We still prioritize the msgAuthDetails object in the payload, over the Authorization header.
      // ARIA are still developing
      if(request.headers.authorization && Object.keys(msgAuthDetails).length === 0) {
        
        const a = request.headers.authorization.split(',');
        a.forEach(c => {
          const firstEqualIndex = c.indexOf('=');
          const keyName = c.substring(0, firstEqualIndex).trim();
          const value = c.substring(firstEqualIndex + 1).trim().replace(/"/g, '');
          msgAuthDetails[keyName] = value;
        });        
      }


      const input = concatMsgAuthDetails(msgAuthDetails, eventPayload);
      const hash = calculateSignatureValue(input);

      if(hash === msgAuthDetails.signatureValue) {
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
  isolateEventPayload,
  concatMsgAuthDetails,
  calculateSignatureValue,
  msgAuthDetailsValidation
};
