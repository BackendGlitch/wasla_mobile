const assert = require('node:assert/strict');
const { test } = require('node:test');
const { AxiosError } = require('axios');

const { toNetworkErrorInfo, toUserFacingErrorCopy } = require('../dist-unit/lib/networkErrors');

function axiosErr(patch) {
  const err = new AxiosError(
    patch.message ?? 'fail',
    patch.code ?? undefined,
    {},
    {},
    patch.response ?? undefined,
  );
  return err;
}

test('maps cancelled axios error', () => {
  const info = toNetworkErrorInfo(axiosErr({ code: 'ERR_CANCELED' }));
  assert.equal(info.kind, 'cancelled');
});

test('maps 401 to unauthorized', () => {
  const info = toNetworkErrorInfo(axiosErr({ response: { status: 401 } }));
  assert.equal(info.kind, 'unauthorized');
});

test('offline copy for network error code', () => {
  const copy = toUserFacingErrorCopy(
    axiosErr({ code: 'ERR_NETWORK', message: 'network error', response: undefined }),
    'fallback',
  );
  assert.equal(copy.title, 'You’re offline');
});
