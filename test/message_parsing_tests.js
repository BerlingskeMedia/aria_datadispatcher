/* jshint node: true */
'use strict';


// Test shortcuts.
const { expect } = require('@hapi/code');
const { describe, it, before, after } = exports.lab = require('@hapi/lab').script();

process.env.ARIA_AUTH_KEY = 'ASas782309UK44qweaxczsg';

const scheme = require('../server/scheme');

describe('message parsing tests', async () => {

  describe('find end of object', async () => {
    
    it('small objects 1', async () => {
      const payload = '{"clientNo":25},"eventPayload":{"test":1}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(15);
    });

    it('small objects 2', async () => {
      const payload = '{"clientNo":26}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(15);
    });

    it('small objects 1', async () => {
      const payload = '{"clientNo":27},"accAccessControlAIDInfo":{"test":3}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(15);
    });

    it('small objects 2', async () => {
      const payload = '{"clientNo":28}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(15);
    });

    it('bigger objects 1', async () => {
      const payload = '{"clientNo":25,"requestDateTime":"2019-06-01T09:48:32Z","ariaAccountID":"AccountID"},"eventPayload":{"test":5}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(84);
    });

    it('bigger objects 2', async () => {
      const payload = '{"clientNo":25,"requestDateTime":"2019-06-01T09:48:32Z","ariaAccountID":"AccountID"},"accAccessControlAIDInfo":{"test":6}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(84);
    });

    it('bigger objects 1', async () => {
      const payload = '{"clientNo":25,"requestDateTime":"2019-06-01T09:48:32Z","ariaAccountID":"AccountID"}}';
      const endOfObject = scheme.findEndOfObject(payload);
      expect(endOfObject).to.equal(84);
    });
  });



  describe('isolate message', async () => {
    
    it('small objects 1', async () => {
      const payload = '{"msgAuthDetails":{"clientNo":25},"eventPayload":{"test":1}}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal('{"test":1}');
    });

    it('small objects 2', async () => {
      const payload = '{"eventPayload":{"test":2},"msgAuthDetails":{"clientNo":26}}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal('{"test":2}');
    });

    it('small objects 1', async () => {
      const payload = '{"msgAuthDetails":{"clientNo":27},"accAccessControlAIDInfo":{"test":3}}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal('{"test":3}');
    });

    it('small objects 2', async () => {
      const payload = '{"accAccessControlAIDInfo":{"test":4},"msgAuthDetails":{"clientNo":28}}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal('{"test":4}');
    });


    it('too many small objects 1', async () => {
      const payload = '{"accAccessControlAIDInfo":{"test":4},"eventPayload":{"test":1},"msgAuthDetails":{"clientNo":28}}';
      try {
        const message = scheme.isolateMessage(payload);
        expect(message).to.be.undefined();
      } catch(err) {
        expect(err).to.error();
      }
    });

    it('small objects 1 and no msgAuthDetails', async () => {
      const payload = '{"test":1}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal(payload);
    });

    it('small objects 2 and no msgAuthDetails', async () => {
      const payload = '{"test":2,"another_test":3}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal(payload);
    });

    it('small objects 3 and no msgAuthDetails', async () => {
      const payload = '{"test":2,"another_test":3,"a_third_key":4}';
      const message = scheme.isolateMessage(payload);
      expect(message).to.equal(payload);
    });
  });
});