import { describe, it, expect, vi } from 'vitest';
import { runV3ToV4Migration, MIGRATION_ID } from './v3-to-v4';
import type { MigrationDeps } from './v3-to-v4';
import type { Bookmark } from '@/types/bookmark';
import type { MushroomRecord } from '@/types/record';
import type { MigrationRecord } from '@/types/migration';

function makeBookmark(id: string): Bookmark {
  return { mushroom_id: id, created_at: '2026-04-01T00:00:00.000Z' };
}

function makeRecord(id: string, mushroomId?: string): MushroomRecord {
  return {
    id,
    mushroom_id: mushroomId,
    mushroom_name_ja: mushroomId ?? '不明',
    observed_at: '2026-04-01T00:00:00.000Z',
    location: { lat: 0, lng: 0 },
    photos: [],
    harvested: false,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
  };
}

function makeDeps(state: {
  bookmarks: Bookmark[];
  records: MushroomRecord[];
  migration?: MigrationRecord;
}): MigrationDeps & {
  removed: string[];
  updated: MushroomRecord[];
  recorded: MigrationRecord | null;
} {
  const removed: string[] = [];
  const updated: MushroomRecord[] = [];
  let recorded: MigrationRecord | null = null;

  return {
    getExistingMigration: vi.fn(async (id) => (state.migration?.id === id ? state.migration : undefined)),
    getAllBookmarks: vi.fn(async () => state.bookmarks),
    removeBookmark: vi.fn(async (mushroomId) => {
      removed.push(mushroomId);
    }),
    getAllRecords: vi.fn(async () => state.records),
    updateRecord: vi.fn(async (r) => {
      updated.push(r);
    }),
    recordMigration: vi.fn(async (r) => {
      recorded = r;
    }),
    removed,
    updated,
    get recorded() {
      return recorded;
    },
  } as unknown as MigrationDeps & { removed: string[]; updated: MushroomRecord[]; recorded: MigrationRecord | null };
}

describe('runV3ToV4Migration', () => {
  it('removes bookmarks whose mushroom_id is not in v2 set', async () => {
    const deps = makeDeps({
      bookmarks: [makeBookmark('amanita_muscaria'), makeBookmark('matsutake')],
      records: [],
    });
    const validIds = new Set(['amanita_muscaria']);
    const result = await runV3ToV4Migration(validIds, deps);
    expect(result.bookmarksDeleted).toBe(1);
    expect(deps.removed).toEqual(['matsutake']);
  });

  it('keeps bookmarks whose mushroom_id is still valid', async () => {
    const deps = makeDeps({
      bookmarks: [makeBookmark('amanita_muscaria')],
      records: [],
    });
    const result = await runV3ToV4Migration(new Set(['amanita_muscaria']), deps);
    expect(result.bookmarksDeleted).toBe(0);
    expect(deps.removed).toEqual([]);
  });

  it('resets records mushroom_id to undefined when not in v2 set, keeping name', async () => {
    const deps = makeDeps({
      bookmarks: [],
      records: [makeRecord('r1', 'matsutake'), makeRecord('r2', 'amanita_muscaria')],
    });
    const result = await runV3ToV4Migration(new Set(['amanita_muscaria']), deps);
    expect(result.recordsReset).toBe(1);
    expect(deps.updated).toHaveLength(1);
    expect(deps.updated[0].id).toBe('r1');
    expect(deps.updated[0].mushroom_id).toBeUndefined();
    // Name preserved for user re-link via MushroomCombobox
    expect(deps.updated[0].mushroom_name_ja).toBe('matsutake');
  });

  it('skips records that already have mushroom_id = undefined', async () => {
    const deps = makeDeps({
      bookmarks: [],
      records: [makeRecord('r1', undefined)],
    });
    const result = await runV3ToV4Migration(new Set(['amanita_muscaria']), deps);
    expect(result.recordsReset).toBe(0);
    expect(deps.updated).toEqual([]);
  });

  it('records the migration after successful run', async () => {
    const deps = makeDeps({
      bookmarks: [makeBookmark('matsutake')],
      records: [],
    });
    const result = await runV3ToV4Migration(new Set(), deps);
    expect(deps.recorded).not.toBeNull();
    expect(deps.recorded!.id).toBe(MIGRATION_ID);
    expect(result.bookmarksDeleted).toBe(1);
  });

  it('is idempotent: returns previously recorded run, no re-execution', async () => {
    const previous: MigrationRecord = {
      id: MIGRATION_ID,
      ranAt: '2026-04-15T00:00:00.000Z',
      bookmarksDeleted: 5,
      recordsReset: 3,
    };
    const deps = makeDeps({
      bookmarks: [makeBookmark('matsutake')],
      records: [makeRecord('r1', 'matsutake')],
      migration: previous,
    });
    const result = await runV3ToV4Migration(new Set(), deps);
    expect(result).toEqual(previous);
    // Crucially: no removeBookmark or updateRecord calls
    expect(deps.removed).toEqual([]);
    expect(deps.updated).toEqual([]);
    expect(deps.recorded).toBeNull();
  });

  it('handles empty database (no bookmarks, no records)', async () => {
    const deps = makeDeps({ bookmarks: [], records: [] });
    const result = await runV3ToV4Migration(new Set(['amanita_muscaria']), deps);
    expect(result.bookmarksDeleted).toBe(0);
    expect(result.recordsReset).toBe(0);
    expect(deps.recorded).not.toBeNull();
  });
});
