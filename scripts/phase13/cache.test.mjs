import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { createCache } from './cache.mjs';

const TEST_DIR = join(process.cwd(), '.cache/phase13-test');

describe('createCache', () => {
  beforeEach(async () => {
    try {
      await access(TEST_DIR);
      await rm(TEST_DIR, { recursive: true });
    } catch {
      // dir doesn't exist
    }
  });
  afterEach(async () => {
    try {
      await access(TEST_DIR);
      await rm(TEST_DIR, { recursive: true });
    } catch {
      // dir doesn't exist
    }
  });

  it('保存した値を get で取り出せる', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    await cache.set('k1', { hello: 'world' });
    expect(await cache.get('k1')).toEqual({ hello: 'world' });
  });

  it('存在しない key では null を返す', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    expect(await cache.get('missing')).toBeNull();
  });

  it('has() は存在の boolean を返す', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    expect(await cache.has('k1')).toBe(false);
    await cache.set('k1', 'v');
    expect(await cache.has('k1')).toBe(true);
  });

  it('TTL 経過後は get で null を返す', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test', ttlMs: 10 });
    await cache.set('k1', 'v');
    await new Promise(r => setTimeout(r, 20));
    expect(await cache.get('k1')).toBeNull();
  });

  it('invalidate() で key を消せる', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    await cache.set('k1', 'v');
    await cache.invalidate('k1');
    expect(await cache.get('k1')).toBeNull();
  });

  it('特殊文字を含む key も扱える', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    await cache.set('Morchella esculenta', { ok: true });
    expect(await cache.get('Morchella esculenta')).toEqual({ ok: true });
  });

  it('異なる key が同じファイルに衝突しない（sanitize 衝突防止）', async () => {
    const cache = createCache({ dir: TEST_DIR, namespace: 'test' });
    await cache.set('Morchella esculenta', { id: 1 });
    await cache.set('Morchella_esculenta', { id: 2 });
    expect(await cache.get('Morchella esculenta')).toEqual({ id: 1 });
    expect(await cache.get('Morchella_esculenta')).toEqual({ id: 2 });
  });
});
