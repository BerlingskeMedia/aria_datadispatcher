'use strict';

const EventEmitter = require('events');
const sinon = require('sinon');
var spy = sinon.spy();

console.log('Using Sinon Spy on Kafka');

module.exports = Object.assign(new EventEmitter(), {
  deliver: spy,
  ready: true,
  reset: function () {
    spy.resetHistory();
  }
});
