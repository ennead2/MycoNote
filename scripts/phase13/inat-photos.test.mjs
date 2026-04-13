import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseInatObservationsResponse } from './inat-photos.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const readFixture = async (name) =>
  JSON.parse(await readFile(join(__dirname, 'fixtures', name), 'utf-8'));

describe('parseInatObservationsResponse', () => {
  it('returns totalResults and hasPhotos true when observations exist', async () => {
    const json = await readFixture('inat-photos-morchella.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(8742);
    expect(result.hasPhotos).toBe(true);
  });

  it('returns hasPhotos false when empty', async () => {
    const json = await readFixture('inat-photos-empty.json');
    const result = parseInatObservationsResponse(json);
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns hasPhotos false when result has no photos', () => {
    const json = { total_results: 5, results: [{ id: 1, photos: [] }] };
    const result = parseInatObservationsResponse(json);
    expect(result.hasPhotos).toBe(false);
  });

  it('returns zero when json is malformed', () => {
    const result = parseInatObservationsResponse({});
    expect(result.totalResults).toBe(0);
    expect(result.hasPhotos).toBe(false);
  });
});
