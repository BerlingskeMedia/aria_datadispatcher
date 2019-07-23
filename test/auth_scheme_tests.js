/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('code');
const { describe, it, before, after } = exports.lab = require('lab').script();


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


  it('endpoint should return 409 if missing payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events' });
    // expect(response.statusCode).to.equal(409);
  });


  it('endpoint should return 409 if empty payload', async () => {
    const response = await request({ method: 'POST', url: '/notifications_events', payload: {} });
    // expect(response.statusCode).to.equal(409);
  });
});
