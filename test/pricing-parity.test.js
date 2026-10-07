// test/pricing-parity.test.js
//
// src/lib/pricing.js is a copy of the backend's src/utils/pricing.js, below
// the header comments, so checkout shows exactly what the server charges.
// This fails as soon as the two differ. It compares with the backend's
// master branch on GitHub, or with a local file when PRICING_SOURCE is set:
//
//   PRICING_SOURCE=../backend/src/utils/pricing.js npm test
//
// To change a pricing rule: change the backend's file and merge it, then
// copy it here below this file's header.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BACKEND = 'https://raw.githubusercontent.com/blacksensei-hub/UrbanPulse-backend/master/src/utils/pricing.js';

/** The file below its leading comment and blank lines, with Unix line ends. */
function body(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length && (lines[i].startsWith('//') || lines[i].trim() === '')) i += 1;
  return lines.slice(i).join('\n').trimEnd();
}

async function backendSource() {
  if (process.env.PRICING_SOURCE) return readFileSync(process.env.PRICING_SOURCE, 'utf8');
  const res = await fetch(BACKEND);
  if (!res.ok) throw new Error(`Could not fetch the backend's pricing.js (${res.status})`);
  return res.text();
}

test("the storefront's pricing rules are exactly the backend's", async () => {
  const backend = await backendSource();
  assert.match(backend, /export function shippingFor/, "that doesn't look like the backend's pricing.js");
  const ours = readFileSync(new URL('../src/lib/pricing.js', import.meta.url), 'utf8');
  assert.equal(body(ours), body(backend),
    "src/lib/pricing.js differs from the backend's: copy the backend file here below the header (merge the backend change first)");
});
