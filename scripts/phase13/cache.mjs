/**
 * Phase 13 共通キャッシュ層。
 * ストレージ: <dir>/<namespace>/<sanitized-key>.json
 * 値フォーマット: { savedAt: number, data: any }
 */
import { readFile, writeFile, rename, rm, access } from 'node:fs/promises';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

function sanitize(key) {
  // encodeURIComponent で 1:1 マッピングを保証
  // 異なる key は異なるファイル名にマッピング
  const encoded = encodeURIComponent(key);
  // Windows で非合法な文字をパーセントエンコード
  return encoded.replace(/[*'()!~]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

export function createCache({ dir, namespace, ttlMs = Infinity }) {
  const baseDir = join(dir, namespace);
  // 初期化時に 1 度だけ mkdirSync（ファクトリー呼び出し時）
  mkdirSync(baseDir, { recursive: true });

  const pathFor = (key) => join(baseDir, `${sanitize(key)}.json`);

  async function get(key) {
    const p = pathFor(key);
    try {
      await access(p);
    } catch {
      return null;
    }
    const content = await readFile(p, 'utf-8');
    const entry = JSON.parse(content);
    if (ttlMs !== Infinity && Date.now() - entry.savedAt > ttlMs) return null;
    return entry.data;
  }

  async function set(key, data) {
    const p = pathFor(key);
    const tmp = p + '.tmp';
    const content = JSON.stringify({ savedAt: Date.now(), data }, null, 2);
    // atomic write: temp file + rename
    await writeFile(tmp, content);
    await rename(tmp, p);
  }

  async function has(key) {
    return (await get(key)) !== null;
  }

  async function invalidate(key) {
    const p = pathFor(key);
    try {
      await rm(p);
    } catch {
      // ファイルがなければ何もしない
    }
  }

  return { get, set, has, invalidate };
}
