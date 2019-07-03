/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('code');
const { describe, it, before, after } = exports.lab = require('lab').script();

// It's a singleton.... but just in case
process.env.ARIA_CLIENT_NO = "25";
process.env.ARIA_AUTH_KEY = "ASas782309UK44qweaxczsg";
const server = require('../server');

describe('signature tests', async () => {
  
  
  it('healthcheck', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/healthcheck',
      headers: { host: 'testing.com' }
    });
    expect(response.statusCode).to.equal(200);
    expect(response.result).to.equal('OK');
  });
});
