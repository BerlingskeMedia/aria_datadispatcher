'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./sqs.js');

const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true' && process.env.NODE_ENV !== 'test');

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


        let event_id = null;

        // Getting the event_id if it's available.
        if(parsedMessage.request && parsedMessage.request.transaction_id) {
          event_id = parsedMessage.request.transaction_id;

          // If the eventPayload is bundled in a enrichedPayload
          // Lowercase l
        } else if(parsedMessage.eventPayload && parsedMessage.eventPayload.request && parsedMessage.eventPayload.request.transaction_id) {
          event_id = parsedMessage.eventPayload.request.transaction_id;

          // Uppercase L
        } else if(parsedMessage.eventPayLoad && parsedMessage.eventPayLoad.request && parsedMessage.eventPayLoad.request.transaction_id) {
          event_id = parsedMessage.eventPayLoad.request.transaction_id;

          
          // TODO: Pending Wajid GUID

          
        } else if(process.env.NODE_ENV === 'test') {
          event_id = 4;

        }        



        if(SQS.ready) {
          try {

            const sqs_id = event_id || Date.now();

            // If the messages is of type "enrichedEventData", we only want the "eventPayload" or "eventPayLoad" on SQS.
            const MessageBody = 
              parsedMessage.eventPayload ? JSON.stringify(parsedMessage.eventPayload) :
              parsedMessage.eventPayLoad ? JSON.stringify(parsedMessage.eventPayLoad) :
              message;

            const resultSQS = await SQS.deliver({
              id: sqs_id,
              message: MessageBody
            });

            if(CONSOLE_LOG_EVENTS) {
              console.log('SQS OK:', JSON.stringify(resultSQS));
            }
          } catch(ex) {
            console.error(ex);
            throw Boom.badRequest('SQS error');
          }
        }


        if(Kafka.ready) {
          try {

            const resultKafka = await Kafka.deliver({
              id: event_id,
              message
            });

            if(CONSOLE_LOG_EVENTS) {
              console.log('Kafka OK:', resultKafka)
            }
          } catch(ex) {
            console.error(ex);
            throw Boom.badRequest('Kafka error');
          }
        }


        return {
          status: `OK`
        };
      }
    });
  }
};
