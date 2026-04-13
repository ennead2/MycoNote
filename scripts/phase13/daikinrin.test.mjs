import { describe, it, expect } from 'vitest';
import { buildPageUrl } from './daikinrin.mjs';

describe('buildPageUrl', () => {
  it('学名と MycoBank ID から大菌輪の Pages URL を構築する', () => {
    const url = buildPageUrl('Morchella esculenta', 247978);
    expect(url).toBe('https://mycoscouter.coolblog.jp/daikinrin/Pages/Morchella_esculenta_247978.html');
  });

  it('属のみ学名（種なし）は例外を投げる', () => {
    expect(() => buildPageUrl('Morchella', 12345)).toThrow(/binomial/);
  });

  it('空白複数・ハイフンを含む学名も正しく処理する', () => {
    const url = buildPageUrl('Amanita muscaria subsp. flavivolvata', 222222);
    expect(url).toContain('Amanita_muscaria_subsp._flavivolvata_222222.html');
  });
});
