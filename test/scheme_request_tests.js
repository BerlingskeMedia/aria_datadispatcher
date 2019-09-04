/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after, afterEach } = exports.lab = require('@hapi/lab').script();


const server = require('../server');
const KafkaSpy = require('./helpers/kafka_spy.js');
const SQSSpy = require('./helpers/aws_sqs_spy.js');


describe('auth scheme tests', async () => {
  

  async function request(options) {

    const req = {
      method: options.method ? options.method : 'GET',
      url: options.url,
      payload: options.payload,
      headers: Object.assign(options.headers || {},
        {
          host: 'testing.com'
        }
      )
    };
    
    // We don't need to reject anything. We only resolve and the tests should validate the response
    return await server.inject(req);
  };
  

  before(async () => {
  });


  after(async () => {
  });

  afterEach(async () => {
    KafkaSpy.reset();
    SQSSpy.reset();
  });


  it('endpoint should return 401 Unauthorized if missing payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events' });
    expect(response.statusCode).to.equal(401);
    
    expect(KafkaSpy.deliver.called).to.equal(false);
    expect(SQSSpy.deliver.called).to.equal(false);
  });


  it('endpoint should return 400 Bad request when msgAuthDetails is valid but no eventPayload', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1,
      userID: "ASaeed"
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails } });
    expect(response.statusCode).to.equal(400);

    expect(KafkaSpy.deliver.called).to.equal(false);
    expect(SQSSpy.deliver.called).to.equal(false);
  });


  it('endpoint should return 200 when msgAuthDetails is valid 1', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-04T08:48:31Z",
      signatureValue: "idS88u89kLz1QVkctNASIINy9CZaUk4np61OJWYgqyk=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1,
      userID: "ASaeed"
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails, eventPayload: { test: 1 } } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
  });


  it('endpoint should return 401 Unauthorized if empty payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events', payload: {} });
    expect(response.statusCode).to.equal(401);

    expect(KafkaSpy.deliver.called).to.equal(false);
    expect(SQSSpy.deliver.called).to.equal(false);
  });



  it('endpoint should return 200 when msgAuthDetails is valid 2', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "00+cdJ1hOqJU3QZFmr0W1w1koE6k3A/NrmYUqZeqjts=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 1,
      userID: "ASaeed"
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails, eventPayload: { test:1 } } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
  });


  it('endpoint should return 200 when msgAuthDetails version 2 is valid 1', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "Gkq68zvCcJOPyDX9V8HouzrcDZWnQjmFFJvO6VyF2oE=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { test:1 };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails, eventPayload } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
  });


  it('endpoint should return 200 when reversed content version 2 is valid 2', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "Gkq68zvCcJOPyDX9V8HouzrcDZWnQjmFFJvO6VyF2oE=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { test:1 };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { eventPayload, msgAuthDetails } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
  });


  it('endpoint should return 200 when reversed content version 2 is valid 2', async () => {
    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-06-01T09:48:32Z",
      signatureValue: "7mL+GjbK0hadVThgdVmWROGU5h74mvIGhf9gNQKZQLI=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { some_unique_event_id: 1, subdocument: { test: 1, anothervalue: 'text' }};

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { eventPayload, msgAuthDetails } });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(1, '{"some_unique_event_id":1,"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(1, '{"some_unique_event_id":1,"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
  });


  it('endpoint should return 200 when auth header 1', async () => {
      
    const headers = {
      'Authorization': 'clientNo="25", requestDateTime="2019-07-03T07:48:31Z", signatureValue="Oy2RsOLi2uJG50NSnRYzxW2zERKJmKGre482K/q7Kl0=", ariaAccountID="AccountID", ariaAccountNo="1234567", signatureVersion=2, userID="ASaeed"'
    };

    const payload = { subdocument: { test: 2, anothervalue: 'text on a request with headers' }};

    const response = await request({ method: 'POST', url: '/notifications_events', payload, headers });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
  });


  it('endpoint should return 200 when auth header is test and payload includes msgAuthDetails', async () => {
      
    const headers = {
      'Authorization': 'clientNo="TEST", requestDateTime="1971-07-01T01:48:31Z", signatureValue="TEST", ariaAccountID="AccountID", ariaAccountNo="1234567", signatureVersion=2, userID="TEST"'
    };

    const msgAuthDetails = {
      clientNo: 25,
      requestDateTime: "2019-07-03T07:48:31Z",
      signatureValue: "amFfBV2SUztr8Yqjzt313tCzt6PT5ED1DwRxnxEz95Y=",
      ariaAccountID: "AccountID",
      ariaAccountNo: 1234567,
      signatureVersion: 2,
      userID: "ASaeed"
    };

    const eventPayload = { some_unique_event_id: 2, subdocument: { test: 1, anothervalue: 'text' }};

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { eventPayload, msgAuthDetails }, headers });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledOnce).to.equal(true);
    expect(KafkaSpy.deliver.calledWith(2, '{"some_unique_event_id":2,"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
    expect(SQSSpy.deliver.calledOnce).to.equal(true);
    expect(SQSSpy.deliver.calledWith(2, '{"some_unique_event_id":2,"subdocument":{"test":1,"anothervalue":"text"}}')).to.equal(true);
  });


  it('allow signatureVersion to be a string', async () => {

    const payload = {
      "msgAuthDetails": {
          "ariaAccountID": null,
          "ariaAccountNo": 41998358,
          "userID": null,
          "clientNo": 25,
          "authKey": null,
          "requestDateTime": "2019-09-03T23:41:42Z",
          "signatureValue": "420ujbOZUMBBnMd/CxlHfiIQtemgfmEM/3MH62uGleU=",
          "signatureVersion": "2"
      },
      "accAccessControlAIDInfo": {
          "accAccessControlAIDFeatureList": [
              {
                  "accessFeature": "WEB/APP",
                  "eligibleForSharing": false,
                  "titleDomain": "www.berlingske.dk"
              }
          ],
          "ariaAccountID": null,
          "ariaAccountNo": 41998358,
          "numberOfAllotments": 0,
          "some_unique_event_id": 3
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledWith(3, '{"accAccessControlAIDFeatureList":[{"accessFeature":"WEB/APP","eligibleForSharing":false,"titleDomain":"www.berlingske.dk"}],"ariaAccountID":null,"ariaAccountNo":41998358,"numberOfAllotments":0,"some_unique_event_id":3}')).to.equal(true);
  });


  it('allow userID to be null', async () => {

    const payload = {
      "msgAuthDetails": {
          "ariaAccountID": null,
          "ariaAccountNo": 41998377,
          "userID": null,
          "clientNo": 25,
          "authKey": null,
          "requestDateTime": "2019-09-03T23:41:42Z",
          "signatureValue": "IIp44ACADznRX/vokoKHJoIwKk6lb8hH4D96y/8ScEg=",
          "signatureVersion": "2"
      },
      "accAccessControlAIDInfo": {
          "accAccessControlAIDFeatureList": [],
          "ariaAccountID": null,
          "ariaAccountNo": 41998377,
          "numberOfAllotments": 0,
          "some_unique_event_id": 4
      }
    };

    const response = await request({ method: 'POST', url: '/notifications_events', payload });
    expect(response.statusCode).to.equal(200);

    expect(KafkaSpy.deliver.calledWith(4, '{"accAccessControlAIDFeatureList":[],"ariaAccountID":null,"ariaAccountNo":41998377,"numberOfAllotments":0,"some_unique_event_id":4}')).to.equal(true);
  });
});
