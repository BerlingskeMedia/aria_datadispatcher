'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./aws_sqs.js');


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
        },
        tags: [ 'notifications' ]
      },
      handler: async (request, h) => {


        // Since the payload is not parsed, it's a buffer. So we need toString()
        const payload = request.payload.toString();
        const message = Scheme.isolateMessage(payload);
        let parsedMessage;


        try {
          // We actually already parsed the payload in the auth scheme.
          // So there should in theory be no errors at this stage.
          parsedMessage = JSON.parse(message);
        } catch(ex) {
          throw Boom.badRequest('Invalid JSON');
        }


        // Getting the event_id if it's available.
        let event_id = parsedMessage.some_unique_event_id || Date.now();


        if(SQS.ready) {
          await SQS.deliver(event_id, message);
        }


        if(Kafka.ready) {
          await Kafka.deliver(event_id, message);
        }


        return {
          status: `OK`
        };
      }
    });
  }
};
