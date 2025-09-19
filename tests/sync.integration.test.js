import test from 'node:test';
import assert from 'node:assert/strict';
import { Storage, Sync, withSync } from '../services/storage.js';

class LocalStorageMock {
  constructor() { this.store = {}; }
  getItem(key) { return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

global.localStorage = new LocalStorageMock();

Sync.configure({ enabled: false, endpoints: {}, tokens: {} });

test('withSync pushes local changes to registered adapter', async () => {
  const remote = new Map();
  Sync.registerAdapter('stub-sync', {
    async pull(key) { return remote.get(key); },
    async push(key, value) { remote.set(key, value); },
  });
  Sync.configure({ enabled: true, defaultAdapter: 'stub-sync', strategy: 'prefer-local', endpoints: {}, tokens: {} });
  withSync('atemix.sync.test', { foo: 'bar' }, { adapterId: 'stub-sync', delay: 0 });
  await Sync.syncKey('atemix.sync.test', { adapterId: 'stub-sync' });
  assert.equal(remote.get('atemix.sync.test').foo, 'bar');
});

test('prefer-remote strategy pulls remote values', async () => {
  const remote = new Map();
  const remoteValue = { foo: 'remote', __ts: Date.now() + 5000 };
  remote.set('atemix.sync.conflict', remoteValue);
  Sync.registerAdapter('stub-remote', {
    async pull(key) { return remote.get(key); },
    async push(key, value) { remote.set(key, value); },
  });
  Sync.configure({ enabled: true, defaultAdapter: 'stub-remote', strategy: 'prefer-remote', endpoints: {}, tokens: {} });
  withSync('atemix.sync.conflict', { foo: 'local' }, { adapterId: 'stub-remote', delay: 0 });
  await Sync.syncKey('atemix.sync.conflict', { adapterId: 'stub-remote' });
  const stored = Storage.get('atemix.sync.conflict');
  assert.equal(stored.foo, 'remote');
});

test('withSync clones arrays without mutating original references', async () => {
  Sync.configure({ enabled: false, endpoints: {}, tokens: {} });
  const original = [{ name: 'A' }];
  withSync('atemix.sync.array', original);
  original[0].name = 'B';
  const stored = Storage.get('atemix.sync.array');
  assert.equal(stored[0].name, 'A');
});
