// AtemiMX - storage helpers (idempotente)
export const Storage={get:(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)),del:(k)=>localStorage.removeItem(k)};
export const K={
  CONFIG:'atemix.config', 
  PLAN:(c)=>`atemix.planeacion.${c}`,
  GBOOK:(g)=>`atemix.gradebook.${g}`,
  RUBRICAS:'atemix.rubricas',
  DIARIO:(g)=>`atemix.diario.${g}`,
  RESOURCES:'atemix.recursos',
  EXAMS:'atemix.exams',

  // Fase 2: Aula y Gamificación
  ASIENTOS: g => `atemix.seating.${g}`,
  SEATING_LAST: g => `atemix.seating.last.${g}`,
  PART: g => `atemix.part.${g}`,
  INSIGNIAS: g => `atemix.insignias.${g}`,
  INSIG_CFG: (g,c) => `atemix.insignias.cfg.${g}.${c}`,
  LOG: g => `atemix.log.${g}`
};

// Helpers de bitácora (idempotentes)
export function appendLog(group, evento){
  try{
    const key = K.LOG(group||'global');
    const arr = Storage.get(key, []);
    arr.unshift(evento);
    const trimmed = arr.slice(0,200);
    Storage.set(key, trimmed);
  }catch(_){ }
}
export function getLogs(group){ try{ return Storage.get(K.LOG(group||'global'), []); }catch(_){ return []; } }


// --- Sincronizacion remota ---
const SyncAdapters = new Map();
let syncConfig = { enabled: false, strategy: 'last-write-wins', endpoints: {}, tokens: {}, queue: [], defaultAdapter: 'cloud' };

export function registerSyncAdapter(id, adapter) {
  if (!id || typeof adapter?.pull !== 'function' || typeof adapter?.push !== 'function') {
    throw new Error('Adapter invalido');
  }
  SyncAdapters.set(id, adapter);
}

export function configureSync(options = {}) {
  const { endpoints, tokens, ...rest } = options || {};
  const mergedEndpoints = { ...(syncConfig.endpoints || {}), ...(endpoints || {}) };
  const mergedTokens = { ...(syncConfig.tokens || {}), ...(tokens || {}) };
  syncConfig = { ...syncConfig, ...rest, endpoints: mergedEndpoints, tokens: mergedTokens };
  ensureDefaultAdapters();
}

function getAdapter(id) {
  const adapter = SyncAdapters.get(id);
  if (!adapter) throw new Error(`Sync adapter no encontrado: ${id}`);
  return adapter;
}

const dirtyKeys = new Set();
const syncingKeys = new Set();
const conflictHandlers = new Map();

export function markDirty(key, meta = {}) {
  dirtyKeys.add(key);
  if (meta.handler && typeof meta.handler === 'function') {
    conflictHandlers.set(key, meta.handler);
  }
}

export async function syncNow({ adapterId, keys } = {}) {
  if (!syncConfig.enabled) return { status: 'disabled' };
  const adapter = getAdapter(adapterId || syncConfig.defaultAdapter || 'cloud');
  const targetKeys = Array.isArray(keys) && keys.length ? keys : Array.from(dirtyKeys);
  const results = [];
  for (const key of targetKeys) {
    if (syncingKeys.has(key)) continue;
    syncingKeys.add(key);
    try {
      const localValue = Storage.get(key);
      const remoteValue = await adapter.pull(key);
      const resolved = resolveConflict(key, localValue, remoteValue);
      if (resolved.action === 'push' && syncConfig.push !== false) {
        await adapter.push(key, resolved.value, { meta: resolved.meta });
      } else if (resolved.action === 'pull' && resolved.value !== undefined) {
        Storage.set(key, resolved.value);
      }
      dirtyKeys.delete(key);
      results.push({ key, status: 'ok', action: resolved.action });
    } catch (err) {
      results.push({ key, status: 'error', error: err?.message || String(err) });
    } finally {
      syncingKeys.delete(key);
    }
  }
  return { status: 'done', results };
}

function resolveConflict(key, localValue, remoteValue) {
  if (localValue === undefined && remoteValue === undefined) {
    return { action: 'noop', value: undefined };
  }
  const handler = conflictHandlers.get(key) || syncConfig.conflictHandler;
  if (typeof handler === 'function') {
    return handler({ key, localValue, remoteValue });
  }
  if (remoteValue === undefined) {
    return { action: 'push', value: localValue, meta: { reason: 'remote-missing' } };
  }
  if (localValue === undefined) {
    return { action: 'pull', value: remoteValue, meta: { reason: 'local-missing' } };
  }
  const strategy = syncConfig.strategy || 'last-write-wins';
  if (strategy === 'merge-array' && Array.isArray(localValue) && Array.isArray(remoteValue)) {
    const merged = mergeArrays(localValue, remoteValue);
    return { action: 'push', value: merged, meta: { reason: 'merge-array' } };
  }
  if (strategy === 'prefer-remote') {
    return { action: 'pull', value: remoteValue, meta: { reason: 'prefer-remote' } };
  }
  if (strategy === 'prefer-local') {
    return { action: 'push', value: localValue, meta: { reason: 'prefer-local' } };
  }
  const localTs = localValue?.__ts || 0;
  const remoteTs = remoteValue?.__ts || 0;
  if (remoteTs > localTs) {
    return { action: 'pull', value: remoteValue, meta: { reason: 'remote-newer' } };
  }
  if (localTs > remoteTs) {
    return { action: 'push', value: localValue, meta: { reason: 'local-newer' } };
  }
  return { action: 'push', value: localValue, meta: { reason: 'tie-local' } };
}

function mergeArrays(localArr, remoteArr) {
  const map = new Map();
  [...remoteArr, ...localArr].forEach((item) => {
    const key = typeof item === 'object' && item ? (item.id || item.key || JSON.stringify(item)) : item;
    if (!map.has(key)) map.set(key, item);
  });
  return Array.from(map.values());
}

export async function scheduleSync({ delay = 1200, adapterId, keys } = {}) {
  if (!syncConfig.enabled) return;
  const job = {
    delay: Math.max(0, Number.isFinite(delay) ? Number(delay) : 0),
    adapterId,
    keys,
    ts: Date.now(),
  };
  syncConfig.queue.push(job);
  triggerQueue();
}

let queueTimer = null;
let currentJob = null;
function triggerQueue() {
  if (queueTimer || !syncConfig.queue.length) return;
  currentJob = syncConfig.queue.shift();
  queueTimer = setTimeout(async () => {
    const job = currentJob;
    queueTimer = null;
    currentJob = null;
    if (!job) return;
    try {
      await syncNow({ adapterId: job.adapterId, keys: job.keys });
    } finally {
      if (syncConfig.queue.length) triggerQueue();
    }
  }, currentJob.delay);
}

export function withSync(key, value, options = {}) {
  let stamped;
  if (Array.isArray(value)) {
    stamped = value.map((item) => {
      if (item && typeof item === 'object') return { ...item };
      return item;
    });
    Object.defineProperty(stamped, '__ts', { value: Date.now(), enumerable: false, configurable: true });
  } else if (value && typeof value === 'object') {
    stamped = { ...value, __ts: Date.now() };
  } else {
    stamped = value;
  }
  Storage.set(key, stamped);
  markDirty(key, options);
  if (syncConfig.enabled) {
    scheduleSync({
      delay: typeof options.delay === 'number' ? options.delay : undefined,
      adapterId: options.adapterId,
      keys: options.keys || [key],
    });
  }
}

export function configureConflictHandler(key, handler) {
  if (typeof handler !== 'function') throw new Error('Handler invalido');
  conflictHandlers.set(key, handler);
}

export async function syncKey(key, options = {}) {
  return syncNow({ keys: [key], ...options });
}


function getEndpoint(type) {
  const base = syncConfig.endpoints?.[type];
  if (!base) return '';
  return String(base).replace(/[\\/]+$/, "");
}

function buildHeaders(type, extra) {
  const token = syncConfig.tokens?.[type];
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

function createHttpAdapter(type) {
  return {
    async pull(key) {
      const base = getEndpoint(type);
      if (!base || typeof fetch !== 'function') return undefined;
      const url = `${base}?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { method: 'GET', headers: buildHeaders(type) });
      if (res.status === 404) return undefined;
      if (!res.ok) throw new Error(`${type} pull HTTP ${res.status}`);
      const data = await res.json();
      return data?.value ?? data;
    },
    async push(key, value, { meta } = {}) {
      const base = getEndpoint(type);
      if (!base || typeof fetch !== 'function') return { status: 'skipped' };
      const payload = { key, value, meta };
      const res = await fetch(base, { method: 'POST', headers: buildHeaders(type), body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`${type} push HTTP ${res.status}`);
      return { status: 'ok' };
    },
  };
}

function createClassroomAdapter() {
  const http = createHttpAdapter('classroom');
  return {
    async pull(key) {
      const match = key.match(/^classroom:roster:(.+)$/);
      if (!match) return http.pull(key);
      const courseId = match[1];
      const base = getEndpoint('classroom');
      if (base && typeof fetch === 'function') {
        const url = `${base.replace(/\/$/, '')}/courses/${encodeURIComponent(courseId)}/students`;
        const res = await fetch(url, { method: 'GET', headers: buildHeaders('classroom') });
        if (!res.ok) throw new Error(`classroom roster HTTP ${res.status}`);
        return await res.json();
      }
      const cacheKey = `atemix.classroom.roster.${courseId}`;
      return Storage.get(cacheKey);
    },
    async push(key, value, ctx) {
      return http.push(key, value, ctx);
    },
  };
}

function ensureAdapter(id, factory) {
  if (SyncAdapters.has(id)) return;
  try {
    registerSyncAdapter(id, factory());
  } catch (err) {
    console.warn?.('[sync] adapter registration failed', id, err);
  }
}

function ensureDefaultAdapters() {
  ensureAdapter('cloud', () => createHttpAdapter('cloud'));
  ensureAdapter('classroom', createClassroomAdapter);
}

export async function importClassroomRoster({ courseId, adapterId } = {}) {
  if (!courseId) throw new Error('courseId requerido');
  const key = `classroom:roster:${courseId}`;
  const adapter = getAdapter(adapterId || 'classroom');
  try {
    const data = await adapter.pull(key);
    if (data && Array.isArray(data.students)) {
      withSync(`atemix.classroom.roster.${courseId}`, { students: data.students });
      return data;
    }
    if (Array.isArray(data)) {
      const payload = { students: data };
      withSync(`atemix.classroom.roster.${courseId}`, payload);
      return payload;
    }
  } catch (err) {
    console.warn?.('[sync] import Classroom fallback', err);
  }
  const fallback = Storage.get(`atemix.classroom.roster.${courseId}`);
  if (fallback) return fallback;
  return { students: [] };
}

export async function backupWorkspace({ adapterId, filter } = {}) {
  const adapter = getAdapter(adapterId || syncConfig.defaultAdapter || 'cloud');
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith('atemix.')) continue;
    if (filter && typeof filter === 'function' && !filter(k)) continue;
    keys.push(k);
  }
  const results = [];
  for (const key of keys) {
    const value = Storage.get(key);
    try {
      await adapter.push(key, value, { meta: { reason: 'backup' } });
      results.push({ key, status: 'ok' });
    } catch (err) {
      results.push({ key, status: 'error', error: err?.message || String(err) });
    }
  }
  return { total: keys.length, results };
}

function getSyncConfigSnapshot() {
  return {
    ...syncConfig,
    queue: [...syncConfig.queue],
  };
}

ensureDefaultAdapters();
export const Sync = {
  registerAdapter: registerSyncAdapter,
  configure: configureSync,
  markDirty,
  syncNow,
  syncKey,
  withSync,
  configureConflictHandler,
  backupWorkspace,
  importClassroomRoster,
  getConfig: getSyncConfigSnapshot,
};
