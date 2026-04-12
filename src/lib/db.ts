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

// ===== Bookmarks =====

export async function getAllBookmarks(): Promise<Bookmark[]> {
  return db.bookmarks.orderBy('created_at').reverse().toArray();
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
