// test/same-site-path.test.js
//
// Sign-in's `next` may only lead to a page on this site.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { sameSitePath } from '../src/utils/sameSitePath.js';

const ORIGIN = 'https://urbanpulse.example';
const check = (next) => sameSitePath(next, ORIGIN);

test('pages on this site are kept, with their query and hash', () => {
  assert.equal(check('/account'), '/account');
  assert.equal(check('/admin/orders?status=paid#top'), '/admin/orders?status=paid#top');
  assert.equal(check('/shop/kente-tee'), '/shop/kente-tee');
});

test('paths that browsers read as another site are refused', () => {
  for (const next of [
    '/\\example.com',
    '//example.com',
    '/\\/example.com',
    '/\t/example.com',
    '/\n/example.com',
    '\\\\example.com',
  ]) {
    assert.equal(check(next), null, JSON.stringify(next));
  }
});

test('full addresses and other schemes are refused', () => {
  for (const next of [
    'https://example.com',
    `${ORIGIN}/account`,
    'javascript:alert(1)',
    'example.com',
    '',
    null,
    undefined,
  ]) {
    assert.equal(check(next), null, JSON.stringify(next));
  }
});
