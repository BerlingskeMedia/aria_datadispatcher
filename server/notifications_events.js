'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./aws_sqs.js');

// To print the event payload details to console log, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true');

if(CONSOLE_LOG_EVENTS) {
  console.log('Console log event has been enabled.')
}

module.exports = {
  name: 'notifications_events',
  version: '1.0.0',
  register: async (server, options) => {

    server.route({
      method: 'POST',
      path: '/',
      options: {
        auth: 'aria',
        payload: {
          parse: false,
          // ^-- Important not to parse the payload, as this will change the payload content from
          //   what AMPS has used to calculate the signatureValue
          allow: ['application/json']
        }
      },
      handler: async (request, h) => {

        if(CONSOLE_LOG_EVENTS) {
          console.log(`Message received: ${ new Date().toISOString() }`);
          console.log(`Message is authenticated: ${ request.auth.isAuthenticated }`);
          console.log(`Headers: ${ Object.keys(request.headers).map(h => `${h}=${request.headers[h]}`).join(', ')}`);
          console.log(`Payload: ${ request.payload.toString()}`);
          // console.log(`Payload: ${ JSON.stringify(request.payload) }`);
          // console.log(`msgAuthDetails: ${ JSON.stringify(request.payload.msgAuthDetails) }`);
          // console.log(`eventData: ${ JSON.stringify(request.payload.eventData) }`);
        }


        const id = Date.now();
        // Since the payload is not parsed, it's a buffer. So we need toString()
        const payload = request.payload.toString();


        if(Kafka.ready) {
          await Kafka.deliver(id, payload);
        }


        if(SQS.ready) {
          await SQS.deliver(id, payload);
        }


        return {
          status: `OK`
        };
      }
    });
  }
};
