import { describe, it, expect } from 'vitest';
import { isAcceptedLicense, formatAttribution, selectByUserDispersion } from './fetch_v2_photos.mjs';

describe('isAcceptedLicense', () => {
  it('accepts CC ライセンス variants', () => {
    expect(isAcceptedLicense('cc0')).toBe(true);
    expect(isAcceptedLicense('cc-by')).toBe(true);
    expect(isAcceptedLicense('cc-by-nc')).toBe(true);
    expect(isAcceptedLicense('cc-by-sa')).toBe(true);
    expect(isAcceptedLicense('cc-by-nc-sa')).toBe(true);
  });

  it('rejects all-rights-reserved (Phase 13-G: 厳格化)', () => {
    expect(isAcceptedLicense(null)).toBe(false);
    expect(isAcceptedLicense(undefined)).toBe(false);
    expect(isAcceptedLicense('')).toBe(false);
    expect(isAcceptedLicense('all-rights-reserved')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAcceptedLicense('CC-BY')).toBe(true);
    expect(isAcceptedLicense('Cc0')).toBe(true);
  });
});

describe('formatAttribution', () => {
  it('combines user login and license label', () => {
    expect(formatAttribution('alice', 'cc-by')).toBe('(c) alice, CC BY');
    expect(formatAttribution('bob', 'cc-by-nc-sa')).toBe('(c) bob, CC BY-NC-SA');
  });

  it('falls back to raw license code when label unknown', () => {
    expect(formatAttribution('alice', 'unknown')).toBe('(c) alice, unknown');
  });

  it('omits license label when empty', () => {
    expect(formatAttribution('alice', '')).toBe('(c) alice');
  });
});

describe('selectByUserDispersion', () => {
  it('round-robins photos across users to maximize diversity', () => {
    const map = new Map([
      ['userA', [{ url: 'a1' }, { url: 'a2' }, { url: 'a3' }]],
      ['userB', [{ url: 'b1' }]],
      ['userC', [{ url: 'c1' }, { url: 'c2' }]],
    ]);
    const out = selectByUserDispersion(map, 4);
    expect(out.map((p) => p.url)).toEqual(['a1', 'b1', 'c1', 'a2']);
  });

  it('exhausts gracefully when fewer photos than maxPhotos', () => {
    const map = new Map([['userA', [{ url: 'a1' }]]]);
    const out = selectByUserDispersion(map, 5);
    expect(out).toHaveLength(1);
  });

  it('returns empty array when no users', () => {
    expect(selectByUserDispersion(new Map(), 5)).toEqual([]);
  });

  it('respects maxPhotos limit when more photos available', () => {
    const map = new Map([
      ['userA', [{ url: 'a1' }, { url: 'a2' }]],
      ['userB', [{ url: 'b1' }, { url: 'b2' }]],
    ]);
    const out = selectByUserDispersion(map, 3);
    expect(out).toHaveLength(3);
  });
});
