'use strict';

const Boom = require('@hapi/boom');
const Kafka = require('./kafka.js');

// To print the event payload details to console log, the ENV var must be explicitly set to "true"
const CONSOLE_LOG_EVENTS = (process.env.CONSOLE_LOG_EVENTS === 'true');

if(CONSOLE_LOG_EVENTS) {
  console.log('Console log event has been enabled.')
}

const KAFKA_INGRESS_TOPIC = process.env.KAFKA_INGRESS_TOPIC;

if(!KAFKA_INGRESS_TOPIC) {
  console.error('Kafka ingress topic missing');
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
          allow: ['text/xml', 'text/plain', 'application/xml', 'application/json']
        }
      },
      handler: async (request, h) => {

        if(CONSOLE_LOG_EVENTS) {
console.log(`
Message received: ${ new Date().toISOString() }
Content Type: ${ request.headers['content-type'] }
Authorization: ${ request.headers['authorization'] }
Payload:
${ request.payload.toString()}`);
        }


        
        // if-statement not needed when we start throwing errors
        if(Kafka.ready) {
            
          if(!KAFKA_INGRESS_TOPIC) {
            console.error('Kafka ingress topic missing');
            // throw Boom.badImplementation('Kafka topic missing');
          }

          const payloads = [
            {
              topic: KAFKA_INGRESS_TOPIC,
              messages: request.payload,
              partition: 0
            }
          ];

          Kafka.send(payloads, function (err, result) {
            if(err) {
              console.error(err);
              // reject(Boom.badRequest());
            } else {
              console.log(result)
              // resolve('OK');
            }
          });
        } else {
          console.error('Kafka not ready');
          // throw Boom.serverUnavailable('Kafka not ready');
        }


        return {
          status: `OK`
        };
      }
    });
  }
};
