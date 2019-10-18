/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after, afterEach } = exports.lab = require('@hapi/lab').script();


const server = require('../server');
const KafkaSpy = require('./helpers/kafka_spy.js');
const SQSSpy = require('./helpers/aws_sqs_spy.js');


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


describe('auth scheme tests', async () => {


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
});
