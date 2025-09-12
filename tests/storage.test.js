import { test } from 'node:test';
import assert from 'node:assert';
import { Storage } from '../services/storage.js';

class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

global.localStorage = new LocalStorageMock();

test('set and get values', () => {
  Storage.set('foo', { bar: 1 });
  assert.deepStrictEqual(Storage.get('foo'), { bar: 1 });
});

test('get provides fallback when missing', () => {
  assert.strictEqual(Storage.get('missing', 'default'), 'default');
});

test('del removes stored key', () => {
  Storage.set('temp', 42);
  Storage.del('temp');
  assert.strictEqual(global.localStorage.getItem('temp'), null);
});
