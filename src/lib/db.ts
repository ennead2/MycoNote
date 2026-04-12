import Dexie, { type Table } from 'dexie';
import { MushroomRecord, RecordPhoto } from '../types/record';
import { ChatSession } from '../types/chat';
import { Bookmark } from '../types/bookmark';

class MycoNoteDB extends Dexie {
  records!: Table<MushroomRecord, string>;
  record_photos!: Table<RecordPhoto, string>;
  chatSessions!: Table<ChatSession, string>;
  bookmarks!: Table<Bookmark, string>;

  constructor() {
    super('MycoNoteDB');
    this.version(1).stores({
      records: 'id, mushroom_id, observed_at',
      record_photos: 'id, record_id',
    });
    this.version(2).stores({
      records: 'id, mushroom_id, observed_at',
      record_photos: 'id, record_id',
      chatSessions: 'id, created_at, updated_at',
    });
    this.version(3).stores({
      records: 'id, mushroom_id, observed_at',
      record_photos: 'id, record_id',
      chatSessions: 'id, created_at, updated_at',
      bookmarks: 'mushroom_id, created_at',
    });
  }
}

export const db = new MycoNoteDB();

// Diagnostic: if another tab holds the DB open at an older schema, the upgrade
// blocks indefinitely. Log so we can spot this in console rather than hanging
// silently on records / bookmarks loading.
if (typeof window !== 'undefined') {
  db.on('blocked', () => {
    console.warn(
      '[db] IndexedDB upgrade blocked — another tab likely holds the previous schema. Close other tabs of this site and reload.'
    );
  });
  // Eagerly open the DB so any schema / migration error shows up in the
  // console at page load, not on first query. Failure is non-fatal: Dexie
  // will retry open on first operation.
  db.open().catch((err) => {
    console.error('[db] open failed:', err);
  });
}

// ===== Bookmarks =====
//
// Note: we `toArray()` then sort in JS rather than `orderBy('created_at')` so
// that the list still loads even if the secondary index failed to build (e.g.
// during a partial schema upgrade from an older device). Bookmark counts are
// tiny — O(n log n) in JS is free.

export async function getAllBookmarks(): Promise<Bookmark[]> {
  const all = await db.bookmarks.toArray();
  return all.sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
}

export async function addBookmark(mushroomId: string): Promise<Bookmark> {
  const bookmark: Bookmark = {
    mushroom_id: mushroomId,
    created_at: new Date().toISOString(),
  };
  await db.bookmarks.put(bookmark);
  return bookmark;
}

export async function removeBookmark(mushroomId: string): Promise<void> {
  await db.bookmarks.delete(mushroomId);
}

export async function addRecord(record: MushroomRecord): Promise<void> {
  await db.records.add(record);
}

export async function getRecord(id: string): Promise<MushroomRecord | undefined> {
  return db.records.get(id);
}

export async function getAllRecords(): Promise<MushroomRecord[]> {
  const records = await db.records.toArray();
  return records.sort((a, b) => {
    if (a.observed_at > b.observed_at) return -1;
    if (a.observed_at < b.observed_at) return 1;
    return 0;
  });
}

export async function updateRecord(record: MushroomRecord): Promise<void> {
  await db.records.put(record);
}

export async function deleteRecord(id: string): Promise<void> {
  await db.transaction('rw', db.records, db.record_photos, async () => {
    await db.records.delete(id);
    await deletePhotosForRecord(id);
  });
}

export async function addPhoto(recordId: string, blob: Blob): Promise<string> {
  const photo: RecordPhoto = {
    id: crypto.randomUUID(),
    record_id: recordId,
    blob,
    created_at: new Date().toISOString(),
  };
  await db.record_photos.add(photo);
  return photo.id;
}

export async function getPhotosForRecord(recordId: string): Promise<RecordPhoto[]> {
  return db.record_photos.where('record_id').equals(recordId).toArray();
}

export async function deletePhotosForRecord(recordId: string): Promise<void> {
  await db.record_photos.where('record_id').equals(recordId).delete();
}
