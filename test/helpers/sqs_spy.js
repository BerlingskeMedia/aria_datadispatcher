'use strict';

const EventEmitter = require('events');
const sinon = require('sinon');
var spy = sinon.spy();

console.log('Using Sinon Spy on AWS SQS');

module.exports = {
  events: new EventEmitter(),
  deliver: spy,
  ready: true,
  healthcheck: async () => { return true },
  reset: function () {
    spy.resetHistory();
  }
};
