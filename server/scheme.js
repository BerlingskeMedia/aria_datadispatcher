/*jshint node: true */
'use strict';


const crypto = require('crypto');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');

// To print the event payload details to console log, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true' && process.env.NODE_ENV !== 'test');

if(CONSOLE_LOG_EVENTS) {
  console.log('Console log event has been enabled.')
}

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true' && process.env.NODE_ENV !== 'test');

if(DISABLE_VALIDATION) {
  console.warn('WARNING: ALL validation has been disabled.')
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
    // In case there is no eventPayload-object, but there is msgAuthDetails-object,
    // which is the unexpected case, we return an empty string.
    if(payload.indexOf('"msgAuthDetails":') > -1) {
      return '';
    } else {
      // But if there is no eventPayload-object and no msgAuthDetails-object,
      // which is the expected case, we simply returns the full payload
      return payload;
    }
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
    throw Boom.unauthorized('Environment variable ARIA_AUTH_KEY missing');
  }

  if(!msgAuthDetails) {
    console.error('Error: msgAuthDetails missing');
    throw Boom.unauthorized('msgAuthDetails missing from Authtozation header or payload');
  }

  const validateResult = msgAuthDetailsValidation.validate(msgAuthDetails);
  if(validateResult.error) {
    console.error(`msgAuthDetails validation error: ${ validateResult.error }`);
    throw Boom.unauthorized(validateResult.error);
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

      if(CONSOLE_LOG_EVENTS) {
        console.log(`Event:::`);
        console.log(`  Headers: ${ Object.keys(request.headers).map(h => `${h}=${request.headers[h]}`).join(', ')}`);
        console.log(`  Payload: ${ request.payload ? request.payload.toString() : '' }`);
      }

      if(!request.payload) {
        console.error('Error: Missing payload');
        throw Boom.unauthorized('Missing payload');
      }

      const originalPayload = request.payload.toString();
      
      if(!originalPayload) {
        console.error('Error: Missing payload');
        throw Boom.unauthorized('Missing payload');
      }


      let msgAuthDetails = {};

      try {
        const parsedPayload = JSON.parse(originalPayload);
        if(parsedPayload.msgAuthDetails) {
          msgAuthDetails = parsedPayload.msgAuthDetails
        }
      } catch(ex) {
        console.error(ex);
        throw Boom.unauthorized('Invalid JSON');
      }

      // We still prioritize the msgAuthDetails object in the payload, over the Authorization header.
      // ARIA are still developing.
      if(Object.keys(msgAuthDetails).length === 0 && request.headers.authorization) {
        
        const parts = request.headers.authorization.split(',');
        parts.forEach(c => {
          const firstEqualIndex = c.indexOf('=');
          const keyName = c.substring(0, firstEqualIndex).trim();
          const value = c.substring(firstEqualIndex + 1).trim().replace(/"/g, '');
          msgAuthDetails[keyName] = value;
        });        
      }


      // Getting the "eventPayload" from the original, unparsed request payload
      const eventPayload = isolateEventPayload(originalPayload);
      const input = concatMsgAuthDetails(msgAuthDetails, eventPayload);
      const hash = calculateSignatureValue(input);

      if(hash === msgAuthDetails.signatureValue) {
        return h.continue;
      } else {
        console.error(`Signature error:::`);
        console.error(`  eventPayload: ${ eventPayload }`);
        console.error(`  msgAuthDetails: ${ msgAuthDetails }`);
        console.error(`  calculateSignatureValue: ${ hash }`);
        throw Boom.unauthorized('Signature value does not match payload');
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
