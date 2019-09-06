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


const CONSOLE_LOG_ERRORS = process.env.NODE_ENV !== 'test';

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true' && process.env.NODE_ENV !== 'test');

if(DISABLE_VALIDATION) {
  console.warn('WARNING: ALL validation has been disabled.')
}


const msgAuthDetailsValidation = Joi.object().keys({
  clientNo: Joi.number().integer().allow([ null, "" ]).default(''),
  requestDateTime: Joi.string().allow([ null, "" ]).required(),
  signatureVersion: Joi.number().required(),
  signatureValue: Joi.string().allow([ 1, 2 ]).default(2).required(),
  ariaAccountID: Joi.string().default('').allow([ null, "" ]).required(),
  ariaAccountNo: Joi.number().integer().allow(null).required(),
  userID: Joi.string().allow([null, '']),
  authKey: Joi.string().allow([null, ''])
});


const validateMsgAuthDetails = function(input) {
  const validateResult = msgAuthDetailsValidation.validate(input);
  if(validateResult.error) {
    if(CONSOLE_LOG_ERRORS) {
      console.error(`msgAuthDetails validation error: ${ validateResult.error }`);
    }
    throw Boom.unauthorized(validateResult.error);
  }

  return validateResult.value;
};


const isolateMessage = function(payload) {

  // We have already parsed the payload. So no need for try-catch
  const parsedPayload = JSON.parse(payload);

  const keys = Object.keys(parsedPayload);

  // If we have no msgAuthDetails, we just want the whole payload
  if(keys.every(n => n !== 'msgAuthDetails')) {
    return payload;
  }

  // If we have msgAuthDetails, but more than one other key, somethings wrong
  if(keys.some(n => n === 'msgAuthDetails') && keys.length !== 2) {
    throw Boom.badRequest('Unexpected count of objects in the payload'); 
  }

  const messageKeyName = keys.find(n => n !== 'msgAuthDetails');
  const messageKeySignature = `"${ messageKeyName }":`;
  const messageObjectIndex = payload.indexOf(messageKeySignature);
  const startOfObject = messageObjectIndex + messageKeySignature.length;
  const endOfObject = startOfObject + findEndOfObject(payload.substring(startOfObject));

  return payload.substring(startOfObject, endOfObject);
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

  msgAuthDetails = validateMsgAuthDetails(msgAuthDetails);

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
        // console.log(`Event::Headers: ${ Object.keys(request.headers).map(h => `${h}=${request.headers[h]}`).join(', ')}`);
        console.log(`Event::Payload: ${ request.payload ? request.payload.toString() : '' }`);
      }

      if(!request.payload) {
        console.error('Error: Missing payload');
        throw Boom.unauthorized('Missing payload');
      }

      const originalPayload = request.payload.toString();
      
      if(!originalPayload) {
        if(CONSOLE_LOG_ERRORS) {
          console.error('Error: Missing payload');
        }
        throw Boom.unauthorized('Missing payload');
      }


      let parsedPayload = {};
      let msgAuthDetails = {};
      let messageKeyName = '';

      try {
        parsedPayload = JSON.parse(originalPayload);
      } catch(ex) {
        if(CONSOLE_LOG_ERRORS) {
          console.error(ex);
        }
        throw Boom.unauthorized('Invalid JSON');
      }


      if(parsedPayload.msgAuthDetails) {

        msgAuthDetails = parsedPayload.msgAuthDetails;

      } else if(request.headers.authorization) {

      // We still prioritize the msgAuthDetails object in the payload, over the Authorization header.
      // But in case we didn't get any msgAuthDetails in the payload, but we got a header...
        
        const parts = request.headers.authorization.split(',');
        parts.forEach(c => {
          const firstEqualIndex = c.indexOf('=');
          const keyName = c.substring(0, firstEqualIndex).trim();
          const value = c.substring(firstEqualIndex + 1).trim().replace(/"/g, '');
          msgAuthDetails[keyName] = value;
        });

      } else {
        if(CONSOLE_LOG_ERRORS) {
          console.error('Error: msgAuthDetails missing');
        }
        throw Boom.unauthorized('msgAuthDetails missing from Authtozation header or payload');
      }

      // Getting the "message" from the original, unparsed request payload
      const message = isolateMessage(originalPayload);

      const input = concatMsgAuthDetails(msgAuthDetails, message);
      const hash = calculateSignatureValue(input);

      // Activate to see hash results - helpful when writing tests
      // console.log(`Matches: ${ hash === msgAuthDetails.signatureValue }\nCalcutated: ${ hash }\nmsgAuthDetails: ${ msgAuthDetails.signatureValue }`);

      if(hash === msgAuthDetails.signatureValue) {

        return h.continue;

      } else {

        if(CONSOLE_LOG_ERRORS) {
          console.error(`Signature:error:calculateSignatureValue: ${ hash }`);
          console.error(`Signature:error:msgAuthDetails: ${ JSON.stringify(msgAuthDetails) }`);
          console.error(`Signature:error:message: ${ message }`);
        }

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
  findEndOfObject,
  isolateMessage,
  concatMsgAuthDetails,
  calculateSignatureValue,
  msgAuthDetailsValidation
};
