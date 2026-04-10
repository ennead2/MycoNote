import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { MushroomRecord } from '../types/record';
import {
  db,
  addRecord,
  getRecord,
  getAllRecords,
  updateRecord,
  deleteRecord,
  addPhoto,
  getPhotosForRecord,
  deletePhotosForRecord,
} from './db';

const createTestRecord = (overrides?: Partial<MushroomRecord>): MushroomRecord => ({
  id: crypto.randomUUID(),
  mushroom_id: 'matsutake',
  mushroom_name_ja: 'マツタケ',
  observed_at: '2026-04-08T10:00:00Z',
  location: { lat: 35.6762, lng: 139.6503, description: '高尾山' },
  photos: [],
  quantity: '3本',
  memo: 'テストメモ',
  harvested: true,
  tags: ['食用'],
  created_at: '2026-04-08T10:00:00Z',
  updated_at: '2026-04-08T10:00:00Z',
  ...overrides,
});

describe('db', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.record_photos.clear();
  });

  it('adds and retrieves a record', async () => {
    const record = createTestRecord();
    await addRecord(record);
    const retrieved = await getRecord(record.id);
    expect(retrieved).toEqual(record);
  });

  it('returns undefined for nonexistent record', async () => {
    const result = await getRecord('nonexistent-id');
    expect(result).toBeUndefined();
  });

  it('retrieves all records', async () => {
    const record1 = createTestRecord();
    const record2 = createTestRecord();
    await addRecord(record1);
    await addRecord(record2);
    const all = await getAllRecords();
    expect(all).toHaveLength(2);
  });

  it('updates a record', async () => {
    const record = createTestRecord();
    await addRecord(record);
    const updated: MushroomRecord = { ...record, memo: '更新済みメモ', updated_at: '2026-04-08T12:00:00Z' };
    await updateRecord(updated);
    const retrieved = await getRecord(record.id);
    expect(retrieved?.memo).toBe('更新済みメモ');
  });

  it('deletes a record and its photos', async () => {
    const record = createTestRecord();
    await addRecord(record);
    const blob = new Blob(['photo data'], { type: 'image/jpeg' });
    await addPhoto(record.id, blob);
    await deleteRecord(record.id);
    const retrieved = await getRecord(record.id);
    expect(retrieved).toBeUndefined();
    const photos = await getPhotosForRecord(record.id);
    expect(photos).toHaveLength(0);
  });

  it('returns records sorted by observed_at descending', async () => {
    const record1 = createTestRecord({ observed_at: '2026-01-01T00:00:00Z' });
    const record2 = createTestRecord({ observed_at: '2026-03-01T00:00:00Z' });
    const record3 = createTestRecord({ observed_at: '2026-02-01T00:00:00Z' });
    await addRecord(record1);
    await addRecord(record2);
    await addRecord(record3);
    const all = await getAllRecords();
    expect(all[0].observed_at).toBe('2026-03-01T00:00:00Z');
    expect(all[1].observed_at).toBe('2026-02-01T00:00:00Z');
    expect(all[2].observed_at).toBe('2026-01-01T00:00:00Z');
  });

  it('adds and retrieves photos for a record', async () => {
    const record = createTestRecord();
    await addRecord(record);
    const blob1 = new Blob(['photo1'], { type: 'image/jpeg' });
    const blob2 = new Blob(['photo2'], { type: 'image/png' });
    const id1 = await addPhoto(record.id, blob1);
    const id2 = await addPhoto(record.id, blob2);
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    const photos = await getPhotosForRecord(record.id);
    expect(photos).toHaveLength(2);
    expect(photos.map((p) => p.id)).toContain(id1);
    expect(photos.map((p) => p.id)).toContain(id2);
  });

  it('deletes all photos for a record', async () => {
    const record = createTestRecord();
    await addRecord(record);
    const blob = new Blob(['photo data'], { type: 'image/jpeg' });
    await addPhoto(record.id, blob);
    await addPhoto(record.id, blob);
    let photos = await getPhotosForRecord(record.id);
    expect(photos).toHaveLength(2);
    await deletePhotosForRecord(record.id);
    photos = await getPhotosForRecord(record.id);
    expect(photos).toHaveLength(0);
  });
});
