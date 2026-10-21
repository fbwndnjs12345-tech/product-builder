'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createNetworkEnforcer } = require('../lib/network-enforcement');

test('simulation mode never claims to grant or revoke real network access', async () => {
  const network = createNetworkEnforcer({ mode: 'simulation' });
  assert.equal(network.connected, false);
  assert.deepEqual(await network.grantAccess({ clientId: 'phone-1', activeUntil: Date.now() + 60_000 }), {
    ok: false, enforcement: 'NOT_CONNECTED', reason: 'simulation_mode'
  });
  assert.deepEqual(await network.revokeAccess({ clientId: 'phone-1' }), {
    ok: false, enforcement: 'NOT_CONNECTED', reason: 'simulation_mode'
  });
});

test('real mode fails closed if no adapter is supplied', () => {
  assert.throws(() => createNetworkEnforcer({ mode: 'real' }), /verified network adapter/);
});

test('real mode validates the client and expiry before delegating', async () => {
  const calls = [];
  const adapter = {
    async grantAccess(session) { calls.push(['grant', session]); return { ok: true }; },
    async revokeAccess(session) { calls.push(['revoke', session]); return { ok: true }; },
    async getStatus() { return { enforcement: 'CONNECTED' }; }
  };
  const network = createNetworkEnforcer({ mode: 'real', adapter });
  await assert.rejects(network.grantAccess({ clientId: 'phone-1', activeUntil: Date.now() - 1 }), /future activeUntil/);
  assert.equal(calls.length, 0);
  await network.grantAccess({ clientId: 'phone-1', activeUntil: Date.now() + 60_000 });
  assert.equal(calls.length, 1);
});
