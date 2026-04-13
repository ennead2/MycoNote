/**
 * Phase 13 共通キャッシュ層。
 * ストレージ: <dir>/<namespace>/<sanitized-key>.json
 * 値フォーマット: { savedAt: number, data: any }
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function sanitize(key) {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function createCache({ dir, namespace, ttlMs = Infinity }) {
  const baseDir = join(dir, namespace);
  if (!existsSync(baseDir)) mkdirSync(baseDir, { recursive: true });

  const pathFor = (key) => join(baseDir, `${sanitize(key)}.json`);

  async function get(key) {
    const p = pathFor(key);
    if (!existsSync(p)) return null;
    const entry = JSON.parse(readFileSync(p, 'utf-8'));
    if (ttlMs !== Infinity && Date.now() - entry.savedAt > ttlMs) return null;
    return entry.data;
  }

  async function set(key, data) {
    writeFileSync(pathFor(key), JSON.stringify({ savedAt: Date.now(), data }, null, 2));
  }

  async function has(key) {
    return (await get(key)) !== null;
  }

  async function invalidate(key) {
    const p = pathFor(key);
    if (existsSync(p)) rmSync(p);
  }

  return { get, set, has, invalidate };
}
