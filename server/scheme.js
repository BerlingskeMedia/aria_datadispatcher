/*jshint node: true */
'use strict';


const crypto = require('crypto');
const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');


const CONSOLE_LOG_ERRORS = process.env.NODE_ENV !== 'test';

// To disable the payload validartion, the ENV var must be explicitly set to "true"
const DISABLE_VALIDATION = (process.env.DISABLE_VALIDATION === 'true' && process.env.NODE_ENV !== 'test');
if(DISABLE_VALIDATION) {
  console.warn('WARNING: ALL validation has been disabled.')
}


const msgAuthDetailsValidation = Joi.object().keys({
  clientNo: Joi.number().integer().allow(null, '').default(''),
  requestDateTime: Joi.string().allow(null, '').required(),
  signatureVersion: Joi.number().allow(1, 2).default(2).required(),
  signatureValue: Joi.string().required(),
  ariaAccountID: Joi.string().default('').allow(null, '').required(),
  ariaAccountNo: Joi.number().integer().allow(null).required(),
  userID: Joi.string().allow(null, ''),
  authKey: Joi.string().allow(null, '')
});


const validateMsgAuthDetails = function(input) {
  const validateResult = msgAuthDetailsValidation.validate(input);
  if(validateResult.error) {
    throw Boom.unauthorized(validateResult.error);
  }

  return validateResult.value;
};


const isolateMsgAuthDetails = function(payload) {
  let parsedPayload;

  try {

    parsedPayload = JSON.parse(payload);

  } catch(err) {
    throw Boom.unauthorized('Invalid JSON');
  }


  if(!parsedPayload.msgAuthDetails) {
    throw Boom.unauthorized('Missing msgAuthDetails');
  }

  validateMsgAuthDetails(parsedPayload.msgAuthDetails);

  return parsedPayload.msgAuthDetails;
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

  return payload.substring(startOfObject, endOfObject).trim();
};


const findEndOfObject = function(input) {
  if(input.length === 0) {
    return position;
  }

  let position = 0;
  let bracketCounter = 0;

  do {

    let nextOpenBracketPosition = input.indexOf('{', position);
    let nextCloseBracketPosition = input.indexOf('}', position);

    if (nextOpenBracketPosition === -1 && nextCloseBracketPosition === -1) {
      // There is no open nor close brackets
      // We return the last postion
      bracketCounter = 0;
      position = input.length - 1;

    } else if(nextOpenBracketPosition === -1 || nextOpenBracketPosition > nextCloseBracketPosition) {
       // There is no open but close brackets, or
       // the next bracket is a close
       bracketCounter += -1;
       position = nextCloseBracketPosition + 1;

    } else if(nextCloseBracketPosition === -1 || nextOpenBracketPosition < nextCloseBracketPosition) {
       // There is an open but no close brackets, or
       // the next bracket is an open
       bracketCounter += 1;
       position = nextOpenBracketPosition + 1;

    } else {

      throw Boom.badRequest('Error when finding end of message object');

    }

  } while (bracketCounter !== 0 );

  return position;
};


// Must return:
//    clientNo|requestDateTime|accountID|accountNo|userID|authKey
const concatMsgAuthDetails = function(msgAuthDetails, message) {

  const ARIA_CLIENT_NO = process.env.ARIA_CLIENT_NO;
  const ARIA_AUTH_KEY = process.env.ARIA_AUTH_KEY;

  if(!ARIA_AUTH_KEY) {
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

      if(!request.payload) {
        if(CONSOLE_LOG_ERRORS) {
          console.error(`Payload:error:missing`);
        }
        throw Boom.unauthorized('Missing payload');
      }

      // Gettting the original, unparsed payload.
      const originalPayload = request.payload.toString();

      if(!originalPayload) {
        if(CONSOLE_LOG_ERRORS) {
          console.error(`Payload:error:missing`);
        }
        throw Boom.unauthorized('Missing payload');
      }


      let msgAuthDetails = {};
      let hash;

      try {

        msgAuthDetails = isolateMsgAuthDetails(originalPayload);

        // Getting the "message" from the original, unparsed request payload
        const message = isolateMessage(originalPayload);
        const input = concatMsgAuthDetails(msgAuthDetails, message);
        hash = calculateSignatureValue(input);

      } catch(err) {

        if(CONSOLE_LOG_ERRORS) {
          console.error(`Auth:error: ${ err.toString() } - ${ originalPayload }`);
        }
        throw err;
      }



      // Activate to see hash results - helpful when writing tests
      // console.log(`Matches: ${ hash === msgAuthDetails.signatureValue }\nCalcutated: ${ hash }\nmsgAuthDetails: ${ msgAuthDetails.signatureValue }`);


      if(hash === msgAuthDetails.signatureValue) {

        return h.continue;

      } else {

        if(CONSOLE_LOG_ERRORS) {
          console.error(`Signature:error:payload: ${ originalPayload }`);
          console.error(`Signature:error:hash: ${ hash }`);
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
