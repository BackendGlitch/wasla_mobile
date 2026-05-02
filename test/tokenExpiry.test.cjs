const assert = require('node:assert/strict');
const { test } = require('node:test');

const { isTokenExpired } = require('../dist-unit/lib/tokenExpiry');

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function makeJwt(expSec) {
  const header = b64urlJson({ alg: 'none', typ: 'JWT' });
  const payload = b64urlJson({ exp: expSec, sub: 'user-1' });
  return `${header}.${payload}.unused`;
}

test('token with far-future exp is not expired', () => {
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24;
  const jwt = makeJwt(exp);
  assert.equal(isTokenExpired(jwt, 30), false);
});

test('token with past exp is expired', () => {
  const exp = Math.floor(Date.now() / 1000) - 3600;
  const jwt = makeJwt(exp);
  assert.equal(isTokenExpired(jwt, 0), true);
});
