/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after } = exports.lab = require('@hapi/lab').script();


const server = require('../server');


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


  it('endpoint should return 401 Unauthorized if missing payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events' });
    expect(response.statusCode).to.equal(401);
  });


  it('endpoint should return 401 Unauthorized if empty payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events', payload: {} });
    expect(response.statusCode).to.equal(401);
  });


  it('endpoint should return 200 when msgAuthDetails is valid 1', async () => {
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
    expect(response.statusCode).to.equal(200);
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

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails, eventData: { test:1 } } });
    expect(response.statusCode).to.equal(200);
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

    const eventData = { test:1 };

    const response = await request({ method: 'POST', url: '/notifications_events', payload: { msgAuthDetails, eventData } });
    expect(response.statusCode).to.equal(200);
  });

});
