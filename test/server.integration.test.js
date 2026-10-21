'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-wifi-test-'));
process.env.ADMIN_PASSWORD = 'test-only-admin-password-123';
process.env.COOKIE_SECRET = 'test-only-cookie-secret-that-is-long-enough-123456';
process.env.NETWORK_MODE = 'simulation';
process.env.DATA_DIR = tempDir;

const { app } = require('../server');
let server;
let baseUrl;

test('admin, QR issuance, one-time claim, revoke, and QR image workflow', async (t) => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), {
    ok: true,
    networkMode: 'simulation',
    enforcement: 'NOT_CONNECTED'
  });

  const unauthorized = await fetch(`${baseUrl}/api/tokens`);
  assert.equal(unauthorized.status, 401);

  const badLogin = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: 'wrong-password' })
  });
  assert.equal(badLogin.status, 401);

  const login = await fetch(`${baseUrl}/api/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ password: process.env.ADMIN_PASSWORD })
  });
  assert.equal(login.status, 200);
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /^wifi_admin=/);

  const adminHeaders = { cookie, 'content-type': 'application/json' };
  const invalidDuration = await fetch(`${baseUrl}/api/tokens`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ storeName: '테스트 매장', durationMinutes: 1 })
  });
  assert.equal(invalidDuration.status, 400);

  const created = await fetch(`${baseUrl}/api/tokens`, {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ storeName: '테스트 매장', durationMinutes: 5 })
  });
  assert.equal(created.status, 201);
  const { token } = await created.json();
  assert.equal(token.storeName, '테스트 매장');
  assert.equal(token.state, 'unused');
  assert.match(token.claimUrl, /^\/claim\/[A-Za-z0-9_-]+$/);

  const qr = await fetch(`${baseUrl}/api/tokens/${token.id}/qr.png`, { headers: { cookie } });
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type') || '', /image\/png/);
  assert.ok((await qr.arrayBuffer()).byteLength > 100);

  const claimPath = token.claimUrl.replace('/claim/', '/api/claim/');
  const claimInfo = await fetch(`${baseUrl}${claimPath}`);
  assert.equal(claimInfo.status, 200);
  assert.equal((await claimInfo.json()).enforcement, 'NOT_CONNECTED');

  const firstClaim = await fetch(`${baseUrl}${claimPath}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(firstClaim.status, 200);
  const claimResult = await firstClaim.json();
  assert.equal(claimResult.ok, true);
  assert.equal(claimResult.enforcement, 'NOT_CONNECTED');
  assert.ok(claimResult.activeUntil > Date.now());

  const duplicateClaim = await fetch(`${baseUrl}${claimPath}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}'
  });
  assert.equal(duplicateClaim.status, 409);

  const revoke = await fetch(`${baseUrl}/api/tokens/${token.id}/revoke`, {
    method: 'POST', headers: adminHeaders, body: '{}'
  });
  assert.equal(revoke.status, 200);
  assert.equal((await revoke.json()).token.state, 'revoked');

  const revokedClaim = await fetch(`${baseUrl}${claimPath}`);
  assert.equal(revokedClaim.status, 410);

  const listed = await fetch(`${baseUrl}/api/tokens`, { headers: { cookie } });
  assert.equal(listed.status, 200);
  const listData = await listed.json();
  assert.equal(listData.tokens.length, 1);
  assert.equal(listData.tokens[0].state, 'revoked');
});
