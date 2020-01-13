'use strict';

const Boom = require('@hapi/boom');
const Joi = require('@hapi/joi');
const Scheme = require('./scheme.js');
const Kafka = require('./kafka.js');
const SQS = require('./sqs.js');


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
        },
        tags: [ 'notifications' ]
      },
      handler: async (request, h) => {


        // Since the payload is not parsed, it's a buffer. So we need toString()
        const payload = request.payload.toString();

        
        if(CONSOLE_LOG_EVENTS) {
          console.log(`Event::Payload: ${ payload }`);
        }


        // Removing the msgAuthDetails-object, and getting only the message part.
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

        // Just to keep the rest to else-if's
        if(false) {
          
          // Getting the event_id if it's available.
        } else if(parsedMessage.request && parsedMessage.request.transaction_id) {
          event_id = parsedMessage.request.transaction_id;
          
          // If the eventPayload is bundled in a enrichedPayload
          // Lowercase l
        } else if(parsedMessage.eventPayload && parsedMessage.eventPayload.request && parsedMessage.eventPayload.request.transaction_id) {
          event_id = parsedMessage.eventPayload.request.transaction_id;
          
          // Uppercase L
        } else if(parsedMessage.eventPayLoad && parsedMessage.eventPayLoad.request && parsedMessage.eventPayLoad.request.transaction_id) {
          event_id = parsedMessage.eventPayLoad.request.transaction_id;


        } else if(parsedMessage.eventIdent && parsedMessage.eventIdent.event_guid) {
          event_id = parsedMessage.eventIdent.event_guid;

        // Fall-back for those tests without IDs
        } else if(process.env.NODE_ENV === 'test') {
          event_id = "4";

        }        


        if(SQS.ready) {
          try {

            
            const MessageBody = 
              // If the messages is of type "enrichedEventData", we only want the "eventPayload" or "eventPayLoad" on SQS.
              parsedMessage.eventPayload ? JSON.stringify(parsedMessage.eventPayload) :
              parsedMessage.eventPayLoad ? JSON.stringify(parsedMessage.eventPayLoad) :
              // If the event is an AMPSEventData, we don't need this in SQS.
              parsedMessage.AMPSEventIdent ? null :
              message;

            if(MessageBody) {
              const resultSQS = await SQS.deliver({
                id: event_id ? event_id.toString() : Date.now().toString(),
                message: MessageBody
              });
            }

          } catch(ex) {
            console.error(ex.toString());
            throw Boom.badRequest('SQS error');
          }
        }


        if(Kafka.ready) {
          try {

            const resultKafka = await Kafka.deliver({
              id: event_id ? event_id.toString() : null, // Kafka aka. The Data Platform prefers a "null" rather than a random ID, if no specific ID was found
              message
            });

          } catch(ex) {
            console.error(ex.toString());
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
