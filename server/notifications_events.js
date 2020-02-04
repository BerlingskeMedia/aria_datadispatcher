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

const CONSOLE_LOG_RESULTS = (process.env.CONSOLE_LOG_RESULTS === 'true' && process.env.NODE_ENV !== 'test');
if(CONSOLE_LOG_RESULTS) {
  console.log('Console log of results has been enabled.')
}

const MAX_BYTES = process.env.MAX_BYTES || 10485760; // 10Mb

let log_sample_count = 0;

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
          allow: ['application/json'],
          maxBytes: MAX_BYTES // 10Mb
        },
        tags: [ 'notifications' ]
      },
      handler: async (request, h) => {


        // Since the payload is not parsed, it's a buffer. So we need toString()
        const payload = request.payload.toString();

        
        if(CONSOLE_LOG_EVENTS) {
          console.log(payload);
        } else {
          // Console logging a sample every 1000 notification
          if(++log_sample_count % 1000 === 0) {
            console.log(payload);
            log_sample_count = 0; // No need to let the number run into millions
          }
        }



        // Removing the msgAuthDetails-object, and getting only the message part.
        const message = Scheme.isolateMessage(payload);
        let parsedMessage;


        try {
          // We actually already parsed the payload in the auth scheme.
          // So there should in theory be no errors at this stage.
          parsedMessage = JSON.parse(message);

          // Making sure the backwards compatibility
          if(parsedMessage.eventPayLoad && !parsedMessage.eventPayload) {
            parsedMessage.eventPayload = parsedMessage.eventPayLoad;
          }

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
        } else if(parsedMessage.eventPayload && parsedMessage.eventPayload.request && parsedMessage.eventPayload.request.transaction_id) {
          event_id = parsedMessage.eventPayload.request.transaction_id;
          

        } else if(parsedMessage.eventIdent && parsedMessage.eventIdent.event_guid) {
          event_id = parsedMessage.eventIdent.event_guid;

        // Fall-back for those tests without IDs
        } else if(process.env.NODE_ENV === 'test') {
          event_id = "4";

        }        


        let error_caught = false;


        if(SQS.ready) {
          try {

            let SQSMessage = message;

              
            // If the messages is of type "enrichedEventData", we only want the "eventPayload" or "eventPayLoad" on SQS.
            if(parsedMessage.eventPayload) {

              try {

                // If the messages is of type "enrichedEventData", there might be the "JSONGetAcctPlansAllMResponse", that we need for B2B customers.
                // This data object container accessFeature for a specific Master Plan. This is useful in the B2B solution.
                if(parsedMessage.JSONGetAcctPlansAllMResponse &&
                  parsedMessage.JSONGetAcctPlansAllMResponse.all_acct_plans_m instanceof Array
                  && parsedMessage.JSONGetAcctPlansAllMResponse.all_acct_plans_m.length > 0) {
                  
                  // Since the JSONGetAcctPlansAllMResponse can get excruciatingly big, the data must be minimizes
                  const all_acct_plans_m = slimDownAllAcctPlansM(parsedMessage.JSONGetAcctPlansAllMResponse.all_acct_plans_m);
                  if(all_acct_plans_m instanceof Array && all_acct_plans_m.length > 0) {
                    parsedMessage.eventPayload.all_acct_plans_m = all_acct_plans_m;
                  }
  
                }
              } catch(err) {
                console.warn('EventPayload Warning:')
                console.warn(err);
              }


              SQSMessage = JSON.stringify(parsedMessage.eventPayload);
              
            }


            if(SQSMessage) {
              const resultSQS = await SQS.deliver({
                id: event_id ? event_id.toString() : Date.now().toString(),
                message: SQSMessage
              });

              if(CONSOLE_LOG_RESULTS) {
                console.log(JSON.stringify(resultSQS));
              }
            }
            
          } catch(ex) {
            console.log('SQS error:');
            console.error(ex);
            // Waiting to rethrow, so we can deliver to Kafka.
            error_caught = true;
          }
        }


        if(Kafka.ready) {
          try {

            const resultKafka = await Kafka.deliver({
              id: event_id ? event_id.toString() : null, // Kafka aka. The Data Platform prefers a "null" rather than a random ID, if no specific ID was found
              message
            });

            if(CONSOLE_LOG_RESULTS) {
              console.log(JSON.stringify(resultKafka));
            }

          } catch(ex) {
            console.log('Kafka error:');
            console.error(ex);
            error_caught = true;
          }
        }
        
        if(error_caught) {
          throw Boom.badRequest();
        }

        return {
          status: `OK`
        };
      }
    });
  }
};


function slimDownAllAcctPlansM(all_acct_plans_m) {

  return all_acct_plans_m.map(acct_plan => {

    // Slimming down each acct_plan to the fields we like
    let slim_acct_plan = (({
      plan_no,
      client_plan_id,
      plan_name,
      plan_desc,
      plan_date,
      plan_units,
      plan_instance_no,
      master_plan_instance_no,
      client_plan_instance_id,
      client_master_plan_instance_id,
      plan_instance_status_cd,
      plan_instance_status_label,
      plan_instance_status_date
    }) => ({
      plan_no,
      client_plan_id,
      plan_name,
      plan_desc,
      plan_date,
      plan_units,
      plan_instance_no,
      master_plan_instance_no,
      client_plan_instance_id,
      client_master_plan_instance_id,
      plan_instance_status_cd,
      plan_instance_status_label,
      plan_instance_status_date
    }))(acct_plan);


    if(acct_plan.product_fields instanceof Array) {

      slim_acct_plan.product_fields = acct_plan.product_fields.map(product_field => {
        // Removing the "SupplementalField1":null
        return (({
          field_name,
          field_value
        }) => ({
          field_name,
          field_value
        }))(product_field);
      });
    }


    if(acct_plan.plan_instance_services instanceof Array) {

      slim_acct_plan.plan_instance_services = acct_plan.plan_instance_services.map(plan_instance_service => {

        // Slimming down each plan_instance_service to the fields we like
        let slim_plan_instance_service = (({
          service_no,
          service_desc,
          client_service_id
        }) => ({
          service_no,
          service_desc,
          client_service_id
        }))(plan_instance_service);

        if(plan_instance_service.all_service_supp_fields instanceof Array) {

          slim_plan_instance_service.all_service_supp_fields = plan_instance_service.all_service_supp_fields.map(service_supp_field => {
            // Removing the "SupplementalField1":null
            return (({
              field_name,
              field_value
            }) => ({
              field_name,
              field_value
            }))(service_supp_field);
          });
        }

        return slim_plan_instance_service;
      });
    }

    return slim_acct_plan;
  });
}
