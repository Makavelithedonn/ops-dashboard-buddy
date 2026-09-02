import assert from 'assert';
import { maskPhone } from '@/lib/admin-data';

// Basic unit tests for phone masking used in admin lists.
const cases: Array<[string, string]> = [
  ['+966501234567', '+96650*****67'],
  ['0501234567', '05*****67'],
  ['123', '***'],
];

for (const [input, expected] of cases) {
  const out = maskPhone(input);
  assert.strictEqual(out, expected, `maskPhone(${input}) -> ${out} (expected ${expected})`);
}

console.log('mask-phone tests passed');
