'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./aws_sqs.js');

// To print the event payload details to console log, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true' && process.env.NODE_ENV !== 'test');

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

        // Since the payload is not parsed, it's a buffer. So we need toString()
        const payload = request.payload.toString();
        
        if(CONSOLE_LOG_EVENTS) {
          console.log(`Message received: ${ new Date().toISOString() }`);
          console.log(`Message is authenticated: ${ request.auth.isAuthenticated }`);
          console.log(`Headers: ${ Object.keys(request.headers).map(h => `${h}=${request.headers[h]}`).join(', ')}`);
          console.log(`Payload: ${ payload}`);
        }
        
        const eventPayload = Scheme.isolateEventPayload(payload);
        let parsedEventPayload;

        try {
          parsedEventPayload = JSON.parse(eventPayload);
        } catch(ex) {
          throw Boom.badRequest();
        }

        let event_id = Date.now();

        // Getting the event_id if it's available.
        if(parsedEventPayload.event_data &&
           parsedEventPayload.event_data.event instanceof Array &&
           parsedEventPayload.event_data.event.length === 1) {
            event_id = parsedEventPayload.event_data.event[0].event_id;
        }

        if(Kafka.ready) {
          await Kafka.deliver(event_id, eventPayload);
        }


        if(SQS.ready) {
          await SQS.deliver(event_id, eventPayload);
        }


        return {
          status: `OK`
        };
      }
    });
  }
};
