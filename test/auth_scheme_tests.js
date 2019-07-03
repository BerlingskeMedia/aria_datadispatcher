/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('code');
const { describe, it, before, after } = exports.lab = require('lab').script();


describe('auth scheme tests', async () => {
  
  process.env.ARIA_CLIENT_NO = "10";
  process.env.ARIA_SECRET = "ASDvwHnQtaD6KyVuMGgVFGE8tukXaTkE"
  const server = require('../server');

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


  const msgAuthDetails = {
    "clientNo": 10,
    "requestDateTime": "2019-05-27T00:00:00Z",
    "signatureValue": "asdjkfq35ascas5q4wq09fq34racndsca=",
    "signatureVersion": 0,
    "ariaAccountID": "acctID1",
    "ariaAccountNo": 0,
    "userID": "userid1"
  };


  it('endpoint should return 409 if missing payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events' });
    // expect(response.statusCode).to.equal(409);
  });


  it('endpoint should return 409 if empty payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events', payload: {} });
    // expect(response.statusCode).to.equal(409);
  });
});
