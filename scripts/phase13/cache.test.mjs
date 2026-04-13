import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createCache } from './cache.mjs';

const TEST_DIR = join(process.cwd(), '.cache/phase13-test');

describe('createCache', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  });
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
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
});
