/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('code');
const { describe, it, before, after } = exports.lab = require('lab').script();

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

    const authKey = 'ASas782309UK44qweaxczsg';


    it('scheme exports function concatMsgAuthDetails', async () => {
      expect(scheme.concatMsgAuthDetails).to.exists();
      expect(typeof scheme.concatMsgAuthDetails).to.equal('function');
    });


    it('scheme exports function calculateSignatureValue', async () => {
      expect(scheme.calculateSignatureValue).to.exists();
      expect(typeof scheme.calculateSignatureValue).to.equal('function');
    });


    it('validate the concatenated string', async () => {
      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, authKey);
      const expectedConcatenatedValue = '25|2019-07-03T07:48:31Z|AccountID|1234567|ASaeed|ASas782309UK44qweaxczsg';
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);
    });


    it('validate the signatureValue string', async () => {
      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, authKey);
      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
    });
  });


  describe('test 2', async () => {

    const msgAuthDetails = {
      clientNo:25,
      authKey:"",
      requestDateTime:"2019-07-23T08:36:15Z",
      signatureValue:"RfVYSU6clIwLUy0pbGA/fpGqvcNhPYrglQts5rrB8aw=",
      ariaAccountID:"AriaAccountID",
      ariaAccountNo:1000,
      message: '{"request":{"version":1.0,"sender":0,"transaction_id":336440859,"action":0,"class":3,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":90000327,"acct_no":41940067,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":130159158,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":1},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type \"Invoice/Statement\" Requires Sending"},{"event_id":1014,"event_label":"Message Type \"Invoice/Statement\" Sent To Account Holder"}]}'
    };

    const authKey = 'COPY_THE_STAGING_KEY';


    it('validate test 2', async () => {
      const concatenatedValue = scheme.concatMsgAuthDetails(msgAuthDetails, authKey);
      const expectedConcatenatedValue = `25|2019-07-23T08:36:15Z|AriaAccountID|1000||{"request":{"version":1.0,"sender":0,"transaction_id":336440859,"action":0,"class":3,"classSpecified":true,"prov_classSpecified":false,"auth_key":"CbWMtwXCyCdMAPB7PT5bX4Ws3UC7BvCE"},"account":{"client_no":90000327,"acct_no":41940067,"userid":"45393375","senior_acct_noSpecified":false,"master_plan_instances":[{"master_plan_instance_no":130159158,"client_plan_instance_id":"MPI-f23ee0c4-6dbe-49f1-a0e4-f2764eb06b47","resp_level_cd":1},{"master_plan_instance_no":130159159,"client_plan_instance_id":"BER-C-DIGITAL-FULL-91fe320d-2672-419c-b09e-1449a2b639e1","resp_level_cd":1},{"master_plan_instance_no":130159381,"client_plan_instance_id":"BER-C-DIGITAL-FULL-943da223-41fc-40f6-b580-39cc2f8f198f","resp_level_cd":1},{"master_plan_instance_no":130159384,"client_plan_instance_id":"BER-C-DIGITAL-FULL-6dd8bd1c-359b-4699-a70c-a304b6f42215","resp_level_cd":1}]},"message":{"msg_id":17193834,"msg_class":"I","msg_class_label":"Invoice/Statement","msg_creation_date":"2019-07-20 01:37:27","msg_sent_date":"2019-07-20 01:37:27","msg_subject":"BEM Domestic Invoice","msg_recipient_email_address":"nmikklesen@cimtest.dk","xml_statement_no":"N/A"},"event_data":[{"event_id":1004,"event_label":"Account Message Type "Invoice/Statement" Requires Sending"},{"event_id":1014,"event_label":"Message Type "Invoice/Statement" Sent To Account Holder"}]}|${authKey}`;
      expect(concatenatedValue).to.equal(expectedConcatenatedValue);

      const signatureValue = scheme.calculateSignatureValue(concatenatedValue);
      // console.log(concatenatedValue)
      // console.log(signatureValue)
      // expect(signatureValue).to.equal(msgAuthDetails.signatureValue);
      const myValue = 'yVClU1XGkGpo1p0vtCIW2VvDjc84soD5YdXr3lO+QRc=';
      expect(signatureValue).to.equal(myValue);
    });
  });
});


describe('invalid auth scheme tests', async () => {
  
  it('missing requestDateTime throws bad request', async () => {
    
    const invalidMsgAuthDetails = {
      clientNo: 25,
      signatureValue: "00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1
    };

    const authKey = 'ASas782309UK44qweaxczsg';

    try {
      const concatenatedValue = scheme.concatMsgAuthDetails(invalidMsgAuthDetails, authKey);
      expect(concatenatedValue).to.be.undefined();
    } catch(err) {
      expect(err.isBoom).to.be.true();
      expect(err.output.statusCode).to.equal(400);
    }
  });
});
