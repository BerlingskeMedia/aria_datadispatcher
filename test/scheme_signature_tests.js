/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after } = exports.lab = require('@hapi/lab').script();

process.env.ARIA_AUTH_KEY = 'ASas782309UK44qweaxczsg';

const scheme = require('../server/scheme');


describe('valid auth scheme', async () => {
  
  describe('test 1', async () => {

    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1,
      userID: "ASaeed"
    };


    it('scheme exports function concatMsgAuthDetails', async () => {
      expect(scheme.concatMsgAuthDetails).to.exists();
      expect(typeof scheme.concatMsgAuthDetails).to.equal('function');
    });


    it('scheme exports function calculateSignatureValue', async () => {
      expect(scheme.calculateSignatureValue).to.exists();
      expect(typeof scheme.calculateSignatureValue).to.equal('function');
    });


    it('validate the concatenated string', async () => {
      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails);
      const expectedConcatenatedValue = '25|2019-07-03T07:48:31Z|AccountID|1234567|ASaeed|ASas782309UK44qweaxczsg';
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);
    });


    it('validate the signatureValue string', async () => {
      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails);
      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });
  });


  describe('tests with eventPayload', async () => {

    
    it('test with eventPayload as an object', async () => {

      const msgAuthDetails = {
        clientNo:25,
        authKey:"",
        requestDateTime:"2019-07-23T08:36:15Z",
        signatureValue:"z6D7O4Ohi1pa59LuKsoQdv8WMN/w5nvKxLDaslJDues=",
        ariaAccountID:"AriaAccountID",
        ariaAccountNo:1000,
        signatureVersion: 2
      };
      
      const eventPayloadStr = '{"request":{"version":1.0,"sender":0,"transaction_id":336440859,"action":0,"class":3,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":90000327,"acct_no":41940067,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":130159158,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":1},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      const expectedConcatenatedValue = `25|2019-07-23T08:36:15Z|AriaAccountID|1000||{"request":{"version":1.0,"sender":0,"transaction_id":336440859,"action":0,"class":3,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":90000327,"acct_no":41940067,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":130159158,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":1},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg`;
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);

      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });


    it('test with ariaAccountID=""', async () => {
      const msgAuthDetails = {
        clientNo:25,
        authKey:"",
        requestDateTime:"2019-01-22T13:35:11Z",
        signatureValue:"3RGgw4PhCFA910s+IQvtTYddxXDfJejcZAd5/gb+t6c=",
        ariaAccountID:"",
        ariaAccountNo:1000,
        signatureVersion: 2
      };
  
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      const expectedConcatenatedValue = '25|2019-01-22T13:35:11Z||1000||{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);

      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });

    
    it('test with ariaAccountID=null', async () => {
      const msgAuthDetails = {
        clientNo:25,
        authKey:"",
        requestDateTime:"2019-01-22T13:35:11Z",
        signatureValue:"3RGgw4PhCFA910s+IQvtTYddxXDfJejcZAd5/gb+t6c=",
        ariaAccountID:null,
        ariaAccountNo:1000,
        signatureVersion: 2
      };
  
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      const expectedConcatenatedValue = '25|2019-01-22T13:35:11Z||1000||{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);

      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });


    it('test with all fields=null', async () => {
      const msgAuthDetails = {
        clientNo: null,
        authKey: null,
        requestDateTime: null,
        signatureValue: "3RGgw4PhCFA910s+IQvtTYddxXDfJejcZAd5/gb+t6c=",
        signatureVersion: 2,
        ariaAccountID: null,
        ariaAccountNo: null
      };
  
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      const expectedConcatenatedValue = '|||||{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);
    });


    it('test with all fields=""', async () => {
      const msgAuthDetails = {
        clientNo: "",
        authKey: "",
        requestDateTime: "",
        signatureValue: "3RGgw4PhCFA910s+IQvtTYddxXDfJejcZAd5/gb+t6c=",
        signatureVersion: 2,
        ariaAccountID: "",
        ariaAccountNo: 0
      };
  
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      const expectedConcatenatedValue = '|||0||{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);
    });


    it('test with all signatureValue missing', async () => {
      const msgAuthDetails = {
        clientNo: "",
        authKey: "",
        requestDateTime: "",
        signatureValue: null,
        ariaAccountID: "",
        ariaAccountNo: ""
      };
  
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      try {
        const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
        expect(concatenatedValue).to.not.exists();
      } catch(ex) {
        expect(ex).to.be.an.error();
      }
    });

    
    it('test with multiple floats', async () => {

      const msgAuthDetails = {
        clientNo:25,
        authKey:"",
        requestDateTime:"2019-01-23T18:36:15Z",
        signatureValue:"eot/icUJUDLMvCNQel5tpr71teFB+81/XuGdfmXEA5I=",
        ariaAccountID:"AriaAccountID",
        ariaAccountNo:1000,
        signatureVersion: 2
      };
      
      const eventPayloadStr = '{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \\"Invoice/Statement\\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \\"Invoice/Statement\\" Sent To Account Holder"}]}';
  
      const expectedConcatenatedValue = '25|2019-01-23T18:36:15Z|AriaAccountID|1000||{"request":{"version":1.0,"sender":3.0,"transaction_id":336440859,"action":0,"class":3.5,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":1.0,"acct_no":1.5,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":2.0,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":2.5},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|ASas782309UK44qweaxczsg';

      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, eventPayloadStr);
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);

      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });
  });
});


describe('invalid auth scheme tests', async () => {
  
  it('missing requestDateTime throws 401 unauthorized', async () => {
    
    const invalidMsgAuthDetails = {
      clientNo: 25,
      signatureValue: "00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1
    };


    try {
      const concatenatedValue = scheme.concatMsgAuthDetails(invalidMsgAuthDetails);
      expect(concatenatedValue).to.be.undefined();
    } catch(err) {
      expect(err.isBoom).to.be.true();
      expect(err.output.statusCode).to.equal(401);
    }
  });
});
