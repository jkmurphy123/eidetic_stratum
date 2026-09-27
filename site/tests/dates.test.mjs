import { test } from 'node:test';
import assert from 'node:assert/strict';
import { editionDate } from '../src/lib/dates.mjs';

test('subtracts 144 years using the UTC date', () => {
  assert.equal(editionDate('2026-01-01T23:30:00Z'), '1882-01-01');
  assert.equal(editionDate('2026-09-25T00:00:00Z'), '1882-09-25');
});

test('clamps a leap date when the target year has no February 29', () => {
  assert.equal(editionDate('2244-02-29T08:00:00Z'), '2100-02-28');
});

test('rejects noncanonical timestamps', () => {
  assert.throws(() => editionDate('2026-01-01'), /UTC timestamp/);
  assert.throws(() => editionDate('2026-02-30T00:00:00Z'), /UTC timestamp/);
});
