/**
 * Short-lived cache of AI results produced through this backend's own /ai/*
 * endpoints (keyed by content hash). At submission time the server reuses its
 * own result instead of trusting client-supplied translations, and avoids paying
 * for the same Gemini call twice.
 */
const crypto = require('crypto');

const TTL_MS = 60 * 60 * 1000;
const MAX = 500;
const store = new Map();

const key = (kind, ...parts) => `${kind}:${crypto.createHash('sha256').update(parts.join('\u0000')).digest('hex')}`;

function get(k) {
  const hit = store.get(k);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    store.delete(k);
    return null;
  }
  return hit.value;
}

function set(k, value) {
  if (store.size >= MAX) store.delete(store.keys().next().value);
  store.set(k, { value, exp: Date.now() + TTL_MS });
}

module.exports = { key, get, set };
