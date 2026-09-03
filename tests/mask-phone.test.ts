import { test, expect } from 'vitest';
import { maskPhone } from '../src/lib/admin-data';

test('maskPhone basic cases', () => {
  expect(maskPhone('+966501234567')).toBe('+96650*****67');
  expect(maskPhone('0501234567')).toBe('05*****67');
  expect(maskPhone('123')).toBe('***');
});
