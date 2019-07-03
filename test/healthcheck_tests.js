/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('code');
const { describe, it, before, after } = exports.lab = require('lab').script();


describe('signature tests', async () => {
  
  const server = require('../server');
  
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
