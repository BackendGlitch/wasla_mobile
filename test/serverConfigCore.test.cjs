const assert = require('node:assert/strict');
const { test } = require('node:test');

const { resolveCentralServerUrlCore } = require('../dist-unit/lib/serverConfigCore');

test('missing env returns helpful error', () => {
  const res = resolveCentralServerUrlCore({ raw: null, platformOS: 'android', isDev: true });
  assert.equal(res.url, null);
  assert.ok(res.error);
  assert.equal(res.raw, null);
});

test('invalid URL is rejected', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'not a url',
    platformOS: 'android',
    isDev: true,
  });
  assert.equal(res.url, null);
  assert.ok(res.error?.includes('Invalid EXPO_PUBLIC_CENTRAL_SERVER_URL'));
  assert.equal(res.raw, 'not a url');
});

test('non-http(s) URL is rejected', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'ftp://example.com',
    platformOS: 'android',
    isDev: true,
  });
  assert.equal(res.url, null);
  assert.ok(res.error?.includes('Only http:// and https:// URLs are supported'));
});

test('android dev rewrites localhost -> 10.0.2.2', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'http://localhost:3000/',
    platformOS: 'android',
    isDev: true,
  });
  assert.equal(res.url, 'http://10.0.2.2:3000');
});

test('android dev rewrites 127.0.0.1 -> 10.0.2.2', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'http://127.0.0.1:3000',
    platformOS: 'android',
    isDev: true,
  });
  assert.equal(res.url, 'http://10.0.2.2:3000');
});

test('ios dev rewrites 10.0.2.2 -> localhost', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'http://10.0.2.2:3000',
    platformOS: 'ios',
    isDev: true,
  });
  assert.equal(res.url, 'http://localhost:3000');
});

test('explicit remote host is never rewritten', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'https://api.example.com/',
    platformOS: 'android',
    isDev: true,
  });
  assert.equal(res.url, 'https://api.example.com');
});

test('prod never rewrites loopback hosts', () => {
  const res = resolveCentralServerUrlCore({
    raw: 'http://localhost:3000',
    platformOS: 'android',
    isDev: false,
  });
  assert.equal(res.url, 'http://localhost:3000');
});

