// test/errors.test.js
//
// Error toasts show the server's reason. Thrown errors reply { error }, a few
// auth routes reply { message }; a 500 body is a raw exception and stays hidden.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getServerMessage, getErrorMessage } from '../src/utils/errors.js';

const failed = (status, data) => ({ response: { status, data } });

test('the server reason wins over the fallback, in either shape', () => {
  assert.equal(getServerMessage(failed(400, { error: 'Coupon has expired' }), 'Invalid coupon code'), 'Coupon has expired');
  assert.equal(getServerMessage(failed(403, { message: 'Your account has been suspended' }), 'Google sign-in failed'), 'Your account has been suspended');
  assert.equal(getServerMessage(failed(400, { error: 'Validation failed', message: 'other' }), 'x'), 'Validation failed');
});

test('deliberate 502/503 replies still reach the screen', () => {
  assert.equal(getServerMessage(failed(503, { error: "Sign-ups aren't open yet. Try again soon." }), 'x'), "Sign-ups aren't open yet. Try again soon.");
});

test('the fallback shows when there is no usable reason', () => {
  assert.equal(getServerMessage(failed(500, { error: 'relation "users" does not exist' }), 'Could not save'), 'Could not save');
  assert.equal(getServerMessage(failed(429, 'Too many requests, please try again later.'), 'Could not save'), 'Could not save');
  assert.equal(getServerMessage(failed(400, { error: '' }), 'Could not save'), 'Could not save');
  assert.equal(getServerMessage(failed(400, { error: { code: 1 } }), 'Could not save'), 'Could not save');
  assert.equal(getServerMessage(new Error('Network Error'), 'Could not save'), 'Could not save');
  assert.equal(getServerMessage(failed(400, {})), undefined);
});

test('getErrorMessage keeps its offline message', () => {
  assert.equal(getErrorMessage(new Error('Network Error'), 'Could not place order'), "You seem to be offline — we'll keep your cart safe.");
  assert.equal(getErrorMessage(failed(400, { error: 'Cart is empty' }), 'Could not place order'), 'Cart is empty');
});
