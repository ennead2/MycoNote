// src/lib/export-import.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db, addRecord, addPhoto } from './db';
import { addChatSession } from './db-chat';
import { buildExportData, validateImportData, importData } from './export-import';
import type { MushroomRecord } from '@/types/record';
import type { ChatSession } from '@/types/chat';
import type { ExportData } from '@/types/export';

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
  tags: [],
  created_at: '2026-04-08T10:00:00Z',
  updated_at: '2026-04-08T10:00:00Z',
  ...overrides,
});

const createTestSession = (overrides?: Partial<ChatSession>): ChatSession => ({
  id: crypto.randomUUID(),
  title: 'テストセッション',
  messages: [{ role: 'user', content: 'テスト' }],
  context: { currentMonth: 4, recordsSummary: 'なし' },
  created_at: '2026-04-09T10:00:00Z',
  updated_at: '2026-04-09T10:00:00Z',
  ...overrides,
});

describe('export-import', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.record_photos.clear();
    await db.chatSessions.clear();
    await db.bookmarks.clear();
  });

  describe('buildExportData', () => {
    it('exports records and chat sessions', async () => {
      const record = createTestRecord();
      await addRecord(record);
      const session = createTestSession();
      await addChatSession(session);

      const data = await buildExportData(false);
      expect(data.version).toBe(1);
      expect(data.records).toHaveLength(1);
      expect(data.records[0].id).toBe(record.id);
      expect(data.chatSessions).toHaveLength(1);
      expect(data.chatSessions[0].id).toBe(session.id);
      expect(data.photos).toBeUndefined();
    });

    it('includes photos when requested', async () => {
      const record = createTestRecord();
      await addRecord(record);
      const blob = new Blob(['photo data'], { type: 'image/jpeg' });
      await addPhoto(record.id, blob);

      const data = await buildExportData(true);
      expect(data.photos).toBeDefined();
      expect(data.photos).toHaveLength(1);
      expect(data.photos![0].record_id).toBe(record.id);
      expect(data.photos![0].data).toBeTruthy();
      expect(data.photos![0].media_type).toBe('image/jpeg');
    });
  });

  describe('validateImportData', () => {
    it('accepts valid export data', () => {
      const data: ExportData = {
        version: 1,
        exported_at: '2026-04-10T00:00:00Z',
        app_version: 'v0.2.0',
        records: [createTestRecord()],
        chatSessions: [createTestSession()],
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(true);
    });

    it('rejects missing version', () => {
      const data = { records: [], chatSessions: [] };
      const result = validateImportData(data as unknown as ExportData);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('バージョン');
    });

    it('rejects wrong version', () => {
      const data = { version: 99, exported_at: '', app_version: '', records: [], chatSessions: [] };
      const result = validateImportData(data as unknown as ExportData);
      expect(result.valid).toBe(false);
    });

    it('rejects non-array records', () => {
      const data = { version: 1, exported_at: '', app_version: '', records: 'bad', chatSessions: [] };
      const result = validateImportData(data as unknown as ExportData);
      expect(result.valid).toBe(false);
    });

    it('rejects records missing required fields', () => {
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [{ id: '1' } as unknown as MushroomRecord],
        chatSessions: [],
      };
      const result = validateImportData(data);
      expect(result.valid).toBe(false);
    });
  });

  describe('importData', () => {
    it('imports new records and sessions', async () => {
      const record = createTestRecord();
      const session = createTestSession();
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [record],
        chatSessions: [session],
      };

      const result = await importData(data);
      expect(result.recordsAdded).toBe(1);
      expect(result.chatSessionsAdded).toBe(1);

      const dbRecord = await db.records.get(record.id);
      expect(dbRecord).toBeDefined();
      const dbSession = await db.chatSessions.get(session.id);
      expect(dbSession).toBeDefined();
    });

    it('skips duplicate records', async () => {
      const record = createTestRecord();
      await addRecord(record);

      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [record],
        chatSessions: [],
      };

      const result = await importData(data);
      expect(result.recordsAdded).toBe(0);
      expect(result.recordsSkipped).toBe(1);
    });

    it('imports photos from export data', async () => {
      const recordId = crypto.randomUUID();
      const record = createTestRecord({ id: recordId });
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [record],
        chatSessions: [],
        photos: [{
          record_id: recordId,
          id: 'photo-1',
          data: btoa('photo data'),
          media_type: 'image/jpeg',
        }],
      };

      const result = await importData(data);
      expect(result.photosAdded).toBe(1);

      const photos = await db.record_photos.where('record_id').equals(recordId).toArray();
      expect(photos).toHaveLength(1);
    });

    it('imports bookmarks from export data', async () => {
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [],
        chatSessions: [],
        bookmarks: [
          { mushroom_id: 'matsutake', created_at: '2026-04-12T00:00:00Z' },
          { mushroom_id: 'shiitake', created_at: '2026-04-12T01:00:00Z' },
        ],
      };

      const result = await importData(data);
      expect(result.bookmarksAdded).toBe(2);
      expect(result.bookmarksSkipped).toBe(0);

      const bookmarks = await db.bookmarks.toArray();
      expect(bookmarks).toHaveLength(2);
    });

    it('skips duplicate bookmarks', async () => {
      await db.bookmarks.add({ mushroom_id: 'matsutake', created_at: '2026-04-11T00:00:00Z' });
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [],
        chatSessions: [],
        bookmarks: [{ mushroom_id: 'matsutake', created_at: '2026-04-12T00:00:00Z' }],
      };

      const result = await importData(data);
      expect(result.bookmarksAdded).toBe(0);
      expect(result.bookmarksSkipped).toBe(1);
    });

    it('imports without bookmarks field (backward compat)', async () => {
      const data: ExportData = {
        version: 1, exported_at: '', app_version: '',
        records: [],
        chatSessions: [],
      };

      const result = await importData(data);
      expect(result.bookmarksAdded).toBe(0);
      expect(result.bookmarksSkipped).toBe(0);
    });
  });
});
