# Phase 2: Records Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 採取記録の登録・閲覧・地図表示・図鑑連携を実装し、オフラインでも完全に動作する記録機能を構築する。

**Architecture:** Dexie.js (IndexedDB) で記録と写真を永続化。RecordsContext で CRUD 操作とフィルター状態を管理。React-Leaflet で地図表示。写真はクライアントサイドで圧縮してBlobとしてIndexedDBに保存。

**Tech Stack:** Dexie.js, React-Leaflet, Leaflet, crypto.randomUUID()

**Design doc:** `docs/superpowers/specs/2026-04-08-myconote-design.md`

---

## File Structure

Phase 2 で作成・変更するファイル:

```
src/
├── lib/
│   ├── db.ts                         # NEW: Dexie.js DB定義
│   ├── db.test.ts                    # NEW: DB操作テスト
│   ├── geolocation.ts                # NEW: GPS取得ユーティリティ
│   ├── geolocation.test.ts           # NEW: GPS テスト
│   ├── photo.ts                      # NEW: 写真圧縮・Blob処理
│   └── photo.test.ts                 # NEW: 写真処理テスト
├── contexts/
│   ├── RecordsContext.tsx             # NEW: 記録CRUD + フィルター
│   └── RecordsContext.test.tsx        # NEW: Contextテスト
├── components/
│   ├── records/
│   │   ├── RecordCard.tsx            # NEW: 記録一覧カード
│   │   ├── RecordCard.test.tsx       # NEW
│   │   ├── RecordForm.tsx            # NEW: 登録・編集フォーム
│   │   ├── RecordForm.test.tsx       # NEW
│   │   ├── RecordMap.tsx             # NEW: Leaflet地図
│   │   ├── PhotoPicker.tsx           # NEW: 写真撮影・選択
│   │   └── PhotoPicker.test.tsx      # NEW
│   └── zukan/
│       └── MushroomDetail.tsx        # MODIFY: 自分の記録セクション追加
├── app/
│   ├── layout.tsx                    # MODIFY: RecordsProvider追加
│   ├── records/
│   │   ├── page.tsx                  # MODIFY: stub → 一覧+地図
│   │   ├── new/page.tsx              # NEW: 新規登録
│   │   └── [id]/
│   │       ├── page.tsx              # NEW: 詳細・編集
│   │       └── RecordDetailClient.tsx # NEW: クライアントコンポーネント
│   └── zukan/
│       └── [id]/
│           └── ZukanDetailClient.tsx  # MODIFY: 記録表示追加
├── constants/
│   └── ui-text.ts                    # MODIFY: records関連テキスト追加
└── types/
    └── record.ts                     # MODIFY: RecordPhoto型追加
```

---

## Task 1: Dependencies & Database Setup

**Files:**
- Modify: `package.json`
- Modify: `src/types/record.ts`
- Create: `src/lib/db.ts`, `src/lib/db.test.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd /c/Users/asaku/Desktop/pc_data/works/MycoNote
npm install leaflet react-leaflet
npm install -D @types/leaflet fake-indexeddb
```

注: `fake-indexeddb` はDexie.jsのテスト用。`uuid` は不要（`crypto.randomUUID()` を使用）。

- [ ] **Step 2: Add RecordPhoto type**

`src/types/record.ts` に追加:
```typescript
export interface MushroomRecord {
  id: string;
  mushroom_id?: string;
  mushroom_name_ja?: string;
  observed_at: string;
  location: {
    lat: number;
    lng: number;
    description?: string;
  };
  photos: string[];
  quantity?: string;
  memo?: string;
  harvested: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface RecordPhoto {
  id: string;
  record_id: string;
  blob: Blob;
  created_at: string;
}
```

- [ ] **Step 3: Write failing tests for db module**

`src/lib/db.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db, addRecord, getRecord, getAllRecords, updateRecord, deleteRecord, addPhoto, getPhotosForRecord, deletePhotosForRecord } from './db';
import type { MushroomRecord } from '@/types/record';

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

  describe('records CRUD', () => {
    it('adds and retrieves a record', async () => {
      const record = createTestRecord();
      await addRecord(record);
      const retrieved = await getRecord(record.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.mushroom_name_ja).toBe('マツタケ');
    });

    it('returns undefined for nonexistent record', async () => {
      const result = await getRecord('nonexistent');
      expect(result).toBeUndefined();
    });

    it('retrieves all records', async () => {
      await addRecord(createTestRecord());
      await addRecord(createTestRecord());
      const all = await getAllRecords();
      expect(all.length).toBe(2);
    });

    it('updates a record', async () => {
      const record = createTestRecord();
      await addRecord(record);
      await updateRecord({ ...record, memo: '更新済み' });
      const updated = await getRecord(record.id);
      expect(updated!.memo).toBe('更新済み');
    });

    it('deletes a record', async () => {
      const record = createTestRecord();
      await addRecord(record);
      await deleteRecord(record.id);
      const result = await getRecord(record.id);
      expect(result).toBeUndefined();
    });

    it('returns records sorted by observed_at descending', async () => {
      await addRecord(createTestRecord({ observed_at: '2026-01-01T00:00:00Z' }));
      await addRecord(createTestRecord({ observed_at: '2026-06-01T00:00:00Z' }));
      await addRecord(createTestRecord({ observed_at: '2026-03-01T00:00:00Z' }));
      const all = await getAllRecords();
      expect(all[0].observed_at).toBe('2026-06-01T00:00:00Z');
      expect(all[2].observed_at).toBe('2026-01-01T00:00:00Z');
    });
  });

  describe('photos', () => {
    it('adds and retrieves photos for a record', async () => {
      const recordId = 'test-record-1';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      const photoId = await addPhoto(recordId, blob);
      expect(photoId).toBeTruthy();

      const photos = await getPhotosForRecord(recordId);
      expect(photos.length).toBe(1);
      expect(photos[0].record_id).toBe(recordId);
    });

    it('deletes all photos for a record', async () => {
      const recordId = 'test-record-2';
      const blob = new Blob(['test'], { type: 'image/jpeg' });
      await addPhoto(recordId, blob);
      await addPhoto(recordId, blob);
      await deletePhotosForRecord(recordId);
      const photos = await getPhotosForRecord(recordId);
      expect(photos.length).toBe(0);
    });
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npm test -- src/lib/db.test.ts
```

Expected: FAIL — module './db' not found.

- [ ] **Step 5: Implement db module**

`src/lib/db.ts`:
```typescript
import Dexie, { type Table } from 'dexie';
import type { MushroomRecord, RecordPhoto } from '@/types/record';

class MycoNoteDB extends Dexie {
  records!: Table<MushroomRecord>;
  record_photos!: Table<RecordPhoto>;

  constructor() {
    super('myconote');
    this.version(1).stores({
      records: 'id, mushroom_id, observed_at',
      record_photos: 'id, record_id',
    });
  }
}

export const db = new MycoNoteDB();

export async function addRecord(record: MushroomRecord): Promise<void> {
  await db.records.add(record);
}

export async function getRecord(id: string): Promise<MushroomRecord | undefined> {
  return db.records.get(id);
}

export async function getAllRecords(): Promise<MushroomRecord[]> {
  return db.records.orderBy('observed_at').reverse().toArray();
}

export async function updateRecord(record: MushroomRecord): Promise<void> {
  await db.records.put(record);
}

export async function deleteRecord(id: string): Promise<void> {
  await db.record_photos.where('record_id').equals(id).delete();
  await db.records.delete(id);
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- src/lib/db.test.ts
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/types/record.ts src/lib/db.ts src/lib/db.test.ts
git commit -m "feat: add Dexie.js database with records and photos CRUD operations"
```

---

## Task 2: Geolocation & Photo Utilities

**Files:**
- Create: `src/lib/geolocation.ts`, `src/lib/geolocation.test.ts`, `src/lib/photo.ts`, `src/lib/photo.test.ts`

- [ ] **Step 1: Write failing tests for geolocation**

`src/lib/geolocation.test.ts`:
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentPosition } from './geolocation';

describe('getCurrentPosition', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns coordinates on success', async () => {
    const mockPosition = {
      coords: { latitude: 35.6762, longitude: 139.6503, accuracy: 10 },
    };
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (success: PositionCallback) => success(mockPosition as GeolocationPosition),
      },
    });

    const result = await getCurrentPosition();
    expect(result.lat).toBe(35.6762);
    expect(result.lng).toBe(139.6503);
  });

  it('throws on permission denied', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_: PositionCallback, error: PositionErrorCallback) =>
          error({ code: 1, message: 'denied', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError),
      },
    });

    await expect(getCurrentPosition()).rejects.toThrow('位置情報の取得が許可されていません');
  });

  it('throws when geolocation not supported', async () => {
    vi.stubGlobal('navigator', {});
    await expect(getCurrentPosition()).rejects.toThrow('位置情報がサポートされていません');
  });
});
```

- [ ] **Step 2: Implement geolocation**

`src/lib/geolocation.ts`:
```typescript
export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export function getCurrentPosition(): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('位置情報がサポートされていません'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('位置情報の取得が許可されていません'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('位置情報を取得できません'));
            break;
          case error.TIMEOUT:
            reject(new Error('位置情報の取得がタイムアウトしました'));
            break;
          default:
            reject(new Error('位置情報の取得に失敗しました'));
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}
```

- [ ] **Step 3: Write failing tests for photo utility**

`src/lib/photo.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { compressImage, blobToDataUrl } from './photo';

describe('compressImage', () => {
  it('returns a blob', async () => {
    // Create a minimal test image blob (1x1 PNG)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 100, 100);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );

    const compressed = await compressImage(blob, 50);
    expect(compressed).toBeInstanceOf(Blob);
    expect(compressed.type).toBe('image/jpeg');
  });
});

describe('blobToDataUrl', () => {
  it('converts blob to data URL string', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const url = await blobToDataUrl(blob);
    expect(url).toMatch(/^data:text\/plain;base64,/);
  });
});
```

- [ ] **Step 4: Implement photo utility**

`src/lib/photo.ts`:
```typescript
const MAX_DIMENSION = 1200;

export async function compressImage(blob: Blob, quality: number = 80): Promise<Blob> {
  const imageBitmap = await createImageBitmap(blob);
  const { width, height } = imageBitmap;

  let targetWidth = width;
  let targetHeight = height;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
    targetWidth = Math.round(width * ratio);
    targetHeight = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);
  imageBitmap.close();

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (result) => resolve(result!),
      'image/jpeg',
      quality / 100
    );
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Blob の読み取りに失敗しました'));
    reader.readAsDataURL(blob);
  });
}
```

- [ ] **Step 5: Run all tests to verify they pass**

```bash
npm test -- src/lib/geolocation.test.ts src/lib/photo.test.ts
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/geolocation.ts src/lib/geolocation.test.ts src/lib/photo.ts src/lib/photo.test.ts
git commit -m "feat: add geolocation and photo compression utilities"
```

---

## Task 3: RecordsContext

**Files:**
- Create: `src/contexts/RecordsContext.tsx`, `src/contexts/RecordsContext.test.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write failing tests for RecordsContext**

`src/contexts/RecordsContext.test.tsx`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { renderHook, act } from '@testing-library/react';
import { RecordsProvider, useRecords } from './RecordsContext';
import { db } from '@/lib/db';
import type { MushroomRecord } from '@/types/record';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <RecordsProvider>{children}</RecordsProvider>;
}

const createTestRecord = (overrides?: Partial<MushroomRecord>): Omit<MushroomRecord, 'id' | 'created_at' | 'updated_at'> => ({
  mushroom_id: 'matsutake',
  mushroom_name_ja: 'マツタケ',
  observed_at: '2026-04-08T10:00:00Z',
  location: { lat: 35.6762, lng: 139.6503, description: '高尾山' },
  photos: [],
  quantity: '3本',
  memo: 'テスト',
  harvested: true,
  tags: [],
  ...overrides,
});

describe('RecordsContext', () => {
  beforeEach(async () => {
    await db.records.clear();
    await db.record_photos.clear();
  });

  it('starts with empty records', () => {
    const { result } = renderHook(() => useRecords(), { wrapper });
    expect(result.current.records).toEqual([]);
  });

  it('adds a record', async () => {
    const { result } = renderHook(() => useRecords(), { wrapper });
    await act(async () => {
      await result.current.addNewRecord(createTestRecord());
    });
    expect(result.current.records.length).toBe(1);
    expect(result.current.records[0].mushroom_name_ja).toBe('マツタケ');
    expect(result.current.records[0].id).toBeTruthy();
  });

  it('deletes a record', async () => {
    const { result } = renderHook(() => useRecords(), { wrapper });
    await act(async () => {
      await result.current.addNewRecord(createTestRecord());
    });
    const id = result.current.records[0].id;
    await act(async () => {
      await result.current.removeRecord(id);
    });
    expect(result.current.records.length).toBe(0);
  });

  it('persists records to IndexedDB', async () => {
    const { result } = renderHook(() => useRecords(), { wrapper });
    await act(async () => {
      await result.current.addNewRecord(createTestRecord());
    });
    const dbRecords = await db.records.toArray();
    expect(dbRecords.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/contexts/RecordsContext.test.tsx
```

- [ ] **Step 3: Implement RecordsContext**

`src/contexts/RecordsContext.tsx`:
```typescript
'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { db, addRecord, getAllRecords, updateRecord as dbUpdateRecord, deleteRecord as dbDeleteRecord, deletePhotosForRecord } from '@/lib/db';
import type { MushroomRecord } from '@/types/record';

type NewRecordInput = Omit<MushroomRecord, 'id' | 'created_at' | 'updated_at'>;

interface RecordsContextValue {
  records: MushroomRecord[];
  isLoading: boolean;
  addNewRecord: (input: NewRecordInput, photoBlobs?: Blob[]) => Promise<MushroomRecord>;
  editRecord: (record: MushroomRecord) => Promise<void>;
  removeRecord: (id: string) => Promise<void>;
  getRecordsByMushroomId: (mushroomId: string) => MushroomRecord[];
}

const RecordsContext = createContext<RecordsContextValue | null>(null);

export function RecordsProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState<MushroomRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllRecords().then((recs) => {
      setRecords(recs);
      setIsLoading(false);
    });
  }, []);

  const addNewRecord = useCallback(async (input: NewRecordInput, photoBlobs?: Blob[]): Promise<MushroomRecord> => {
    const now = new Date().toISOString();
    const record: MushroomRecord = {
      ...input,
      id: crypto.randomUUID(),
      photos: [],
      created_at: now,
      updated_at: now,
    };

    if (photoBlobs && photoBlobs.length > 0) {
      const { addPhoto } = await import('@/lib/db');
      const photoIds: string[] = [];
      for (const blob of photoBlobs) {
        const photoId = await addPhoto(record.id, blob);
        photoIds.push(photoId);
      }
      record.photos = photoIds;
    }

    await addRecord(record);
    setRecords((prev) => [record, ...prev]);
    return record;
  }, []);

  const editRecord = useCallback(async (record: MushroomRecord): Promise<void> => {
    const updated = { ...record, updated_at: new Date().toISOString() };
    await dbUpdateRecord(updated);
    setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  }, []);

  const removeRecord = useCallback(async (id: string): Promise<void> => {
    await dbDeleteRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getRecordsByMushroomId = useCallback((mushroomId: string): MushroomRecord[] => {
    return records.filter((r) => r.mushroom_id === mushroomId);
  }, [records]);

  return (
    <RecordsContext.Provider value={{ records, isLoading, addNewRecord, editRecord, removeRecord, getRecordsByMushroomId }}>
      {children}
    </RecordsContext.Provider>
  );
}

export function useRecords(): RecordsContextValue {
  const context = useContext(RecordsContext);
  if (!context) throw new Error('useRecords must be used within RecordsProvider');
  return context;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/contexts/RecordsContext.test.tsx
```

- [ ] **Step 5: Add RecordsProvider to root layout**

`src/app/layout.tsx` の AppProvider の中に RecordsProvider を追加:
```typescript
import { RecordsProvider } from '@/contexts/RecordsContext';

// ... existing code ...
<AppProvider>
  <RecordsProvider>
    <OfflineBanner />
    <main className="max-w-lg mx-auto w-full flex-1 pb-16">
      {children}
    </main>
    <BottomNav />
  </RecordsProvider>
</AppProvider>
```

- [ ] **Step 6: Commit**

```bash
git add src/contexts/RecordsContext.tsx src/contexts/RecordsContext.test.tsx src/app/layout.tsx
git commit -m "feat: add RecordsContext with CRUD operations and IndexedDB sync"
```

---

## Task 4: UI Text Updates & PhotoPicker Component

**Files:**
- Modify: `src/constants/ui-text.ts`
- Create: `src/components/records/PhotoPicker.tsx`, `src/components/records/PhotoPicker.test.tsx`

- [ ] **Step 1: Add records UI text**

`src/constants/ui-text.ts` の `records` セクションを更新:
```typescript
records: {
  title: '採取記録',
  comingSoon: 'この機能はPhase 2以降で実装予定です',  // 削除してOK
  newRecord: '新規記録',
  editRecord: '記録を編集',
  deleteRecord: '記録を削除',
  deleteConfirm: 'この記録を削除しますか？',
  noRecords: '採取記録がありません',
  form: {
    mushroom: 'キノコの種類',
    mushroomPlaceholder: '図鑑から選択...',
    mushroomNameManual: '種名（手入力）',
    date: '日時',
    location: '場所',
    locationDescription: '場所の説明',
    locationPlaceholder: '例: 高尾山 6号路付近',
    gpsGet: '現在地を取得',
    gpsGetting: '取得中...',
    gpsFailed: '位置情報を取得できません。手動で入力してください。',
    photos: '写真',
    photosAdd: '写真を追加',
    quantity: '数量',
    quantityPlaceholder: '例: 3本',
    memo: 'メモ',
    harvested: '採取した',
    observed: '観察のみ',
    save: '保存',
    saving: '保存中...',
  },
  listView: 'リスト',
  mapView: '地図',
  filterBySpecies: '種別',
  filterByDate: '日付',
},
```

- [ ] **Step 2: Write failing tests for PhotoPicker**

`src/components/records/PhotoPicker.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoPicker } from './PhotoPicker';

describe('PhotoPicker', () => {
  it('renders add photo button', () => {
    render(<PhotoPicker photos={[]} onPhotosChange={() => {}} />);
    expect(screen.getByText('写真を追加')).toBeInTheDocument();
  });

  it('displays photo count', () => {
    const photos = [new Blob(['1'], { type: 'image/jpeg' }), new Blob(['2'], { type: 'image/jpeg' })];
    render(<PhotoPicker photos={photos} onPhotosChange={() => {}} />);
    expect(screen.getByText('2枚')).toBeInTheDocument();
  });

  it('calls onPhotosChange when file is selected', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoPicker photos={[]} onPhotosChange={onChange} />);

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);
    expect(onChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement PhotoPicker**

`src/components/records/PhotoPicker.tsx`:
```typescript
'use client';

import { useRef, useState, useEffect } from 'react';
import { blobToDataUrl } from '@/lib/photo';

interface PhotoPickerProps {
  photos: Blob[];
  onPhotosChange: (photos: Blob[]) => void;
}

export function PhotoPicker({ photos, onPhotosChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const loadPreviews = async () => {
      const urls = await Promise.all(photos.map((b) => blobToDataUrl(b)));
      setPreviews(urls);
    };
    loadPreviews();
  }, [photos]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const { compressImage } = await import('@/lib/photo');
    const newBlobs: Blob[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      newBlobs.push(compressed);
    }
    onPhotosChange([...photos, ...newBlobs]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-forest-800 border border-forest-600 px-4 py-2 text-sm text-forest-200 hover:bg-forest-700 transition-colors"
        >
          写真を追加
        </button>
        {photos.length > 0 && (
          <span className="text-sm text-forest-400">{photos.length}枚</span>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {previews.map((url, i) => (
            <div key={i} className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-forest-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`写真 ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/records/PhotoPicker.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/constants/ui-text.ts src/components/records/PhotoPicker.tsx src/components/records/PhotoPicker.test.tsx
git commit -m "feat: add PhotoPicker component and records UI text constants"
```

---

## Task 5: RecordForm & New Record Page

**Files:**
- Create: `src/components/records/RecordForm.tsx`, `src/components/records/RecordForm.test.tsx`, `src/app/records/new/page.tsx`

- [ ] **Step 1: Write failing tests for RecordForm**

`src/components/records/RecordForm.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecordForm } from './RecordForm';

vi.mock('@/lib/geolocation', () => ({
  getCurrentPosition: vi.fn().mockResolvedValue({ lat: 35.6762, lng: 139.6503, accuracy: 10 }),
}));

describe('RecordForm', () => {
  it('renders all form fields', () => {
    render(<RecordForm onSubmit={() => Promise.resolve()} />);
    expect(screen.getByText('日時')).toBeInTheDocument();
    expect(screen.getByText('場所')).toBeInTheDocument();
    expect(screen.getByText('写真')).toBeInTheDocument();
    expect(screen.getByText('メモ')).toBeInTheDocument();
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('renders GPS button', () => {
    render(<RecordForm onSubmit={() => Promise.resolve()} />);
    expect(screen.getByText('現在地を取得')).toBeInTheDocument();
  });

  it('renders harvest toggle', () => {
    render(<RecordForm onSubmit={() => Promise.resolve()} />);
    expect(screen.getByText('採取した')).toBeInTheDocument();
    expect(screen.getByText('観察のみ')).toBeInTheDocument();
  });

  it('shows mushroom selection from catalog', () => {
    render(<RecordForm onSubmit={() => Promise.resolve()} />);
    expect(screen.getByText('キノコの種類')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement RecordForm**

`src/components/records/RecordForm.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { mushrooms } from '@/data/mushrooms';
import { getCurrentPosition } from '@/lib/geolocation';
import { PhotoPicker } from './PhotoPicker';
import { Button } from '@/components/ui/Button';
import { UI_TEXT } from '@/constants/ui-text';
import type { MushroomRecord } from '@/types/record';

type RecordInput = Omit<MushroomRecord, 'id' | 'created_at' | 'updated_at'>;

interface RecordFormProps {
  initialData?: MushroomRecord;
  onSubmit: (data: RecordInput, photos: Blob[]) => Promise<void>;
}

export function RecordForm({ initialData, onSubmit }: RecordFormProps) {
  const [mushroomId, setMushroomId] = useState(initialData?.mushroom_id || '');
  const [mushroomNameManual, setMushroomNameManual] = useState(initialData?.mushroom_name_ja || '');
  const [observedAt, setObservedAt] = useState(initialData?.observed_at?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [lat, setLat] = useState(initialData?.location.lat?.toString() || '');
  const [lng, setLng] = useState(initialData?.location.lng?.toString() || '');
  const [locationDesc, setLocationDesc] = useState(initialData?.location.description || '');
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [quantity, setQuantity] = useState(initialData?.quantity || '');
  const [memo, setMemo] = useState(initialData?.memo || '');
  const [harvested, setHarvested] = useState(initialData?.harvested ?? true);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [isSaving, setIsSaving] = useState(false);

  const selectedMushroom = mushrooms.find((m) => m.id === mushroomId);

  const handleGps = async () => {
    setGpsStatus('loading');
    try {
      const pos = await getCurrentPosition();
      setLat(pos.lat.toFixed(6));
      setLng(pos.lng.toFixed(6));
      setGpsStatus('idle');
    } catch {
      setGpsStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const data: RecordInput = {
      mushroom_id: mushroomId || undefined,
      mushroom_name_ja: selectedMushroom?.names.ja || mushroomNameManual || undefined,
      observed_at: new Date(observedAt).toISOString(),
      location: {
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
        description: locationDesc || undefined,
      },
      photos: [],
      quantity: quantity || undefined,
      memo: memo || undefined,
      harvested,
      tags: [],
    };

    try {
      await onSubmit(data, photos);
    } finally {
      setIsSaving(false);
    }
  };

  const T = UI_TEXT.records.form;

  return (
    <form onSubmit={handleSubmit} className="space-y-5 px-4 py-4">
      {/* Mushroom selection */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.mushroom}</label>
        <select
          value={mushroomId}
          onChange={(e) => setMushroomId(e.target.value)}
          className="w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100"
        >
          <option value="">{T.mushroomPlaceholder}</option>
          {mushrooms.map((m) => (
            <option key={m.id} value={m.id}>{m.names.ja}</option>
          ))}
        </select>
        {!mushroomId && (
          <input
            type="text"
            value={mushroomNameManual}
            onChange={(e) => setMushroomNameManual(e.target.value)}
            placeholder={T.mushroomNameManual}
            className="mt-2 w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500"
          />
        )}
      </div>

      {/* Date */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.date}</label>
        <input
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
          className="w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.location}</label>
        <div className="flex gap-2 mb-2">
          <input type="text" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="緯度" className="flex-1 rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500" />
          <input type="text" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="経度" className="flex-1 rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500" />
        </div>
        <div className="flex gap-2 mb-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleGps} disabled={gpsStatus === 'loading'}>
            {gpsStatus === 'loading' ? T.gpsGetting : T.gpsGet}
          </Button>
        </div>
        {gpsStatus === 'error' && (
          <p className="text-xs text-yellow-500">{T.gpsFailed}</p>
        )}
        <input
          type="text"
          value={locationDesc}
          onChange={(e) => setLocationDesc(e.target.value)}
          placeholder={T.locationPlaceholder}
          className="w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500"
        />
      </div>

      {/* Photos */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.photos}</label>
        <PhotoPicker photos={photos} onPhotosChange={setPhotos} />
      </div>

      {/* Quantity */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.quantity}</label>
        <input
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={T.quantityPlaceholder}
          className="w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500"
        />
      </div>

      {/* Memo */}
      <div>
        <label className="block text-sm font-bold text-forest-300 mb-1">{T.memo}</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-forest-600 bg-forest-800 px-3 py-2 text-sm text-forest-100 placeholder-forest-500 resize-none"
        />
      </div>

      {/* Harvest toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setHarvested(true)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${harvested ? 'bg-forest-500 text-white' : 'bg-forest-800 text-forest-400'}`}
        >
          {T.harvested}
        </button>
        <button
          type="button"
          onClick={() => setHarvested(false)}
          className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${!harvested ? 'bg-forest-500 text-white' : 'bg-forest-800 text-forest-400'}`}
        >
          {T.observed}
        </button>
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSaving}>
        {isSaving ? T.saving : T.save}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Create new record page**

`src/app/records/new/page.tsx`:
```typescript
'use client';

import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { RecordForm } from '@/components/records/RecordForm';
import { useRecords } from '@/contexts/RecordsContext';
import { UI_TEXT } from '@/constants/ui-text';

export default function NewRecordPage() {
  const router = useRouter();
  const { addNewRecord } = useRecords();

  const handleSubmit = async (data: Parameters<typeof addNewRecord>[0], photos: Blob[]) => {
    await addNewRecord(data, photos);
    router.push('/records');
  };

  return (
    <div>
      <PageHeader title={UI_TEXT.records.newRecord} showBack />
      <RecordForm onSubmit={handleSubmit} />
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/records/RecordForm.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/records/RecordForm.tsx src/components/records/RecordForm.test.tsx src/app/records/new/
git commit -m "feat: add record creation form with GPS, photo picker, and mushroom selection"
```

---

## Task 6: RecordCard & Records List Page

**Files:**
- Create: `src/components/records/RecordCard.tsx`, `src/components/records/RecordCard.test.tsx`
- Modify: `src/app/records/page.tsx`

- [ ] **Step 1: Write failing tests for RecordCard**

`src/components/records/RecordCard.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecordCard } from './RecordCard';
import type { MushroomRecord } from '@/types/record';

const mockRecord: MushroomRecord = {
  id: 'test-1',
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
};

describe('RecordCard', () => {
  it('renders mushroom name', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('マツタケ')).toBeInTheDocument();
  });

  it('renders date', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders location description', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('高尾山')).toBeInTheDocument();
  });

  it('links to record detail page', () => {
    render(<RecordCard record={mockRecord} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/records/test-1');
  });

  it('shows harvest badge when harvested', () => {
    render(<RecordCard record={mockRecord} />);
    expect(screen.getByText('採取')).toBeInTheDocument();
  });

  it('shows observe badge when not harvested', () => {
    render(<RecordCard record={{ ...mockRecord, harvested: false }} />);
    expect(screen.getByText('観察')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement RecordCard**

`src/components/records/RecordCard.tsx`:
```typescript
import Link from 'next/link';
import type { MushroomRecord } from '@/types/record';

interface RecordCardProps {
  record: MushroomRecord;
}

export function RecordCard({ record }: RecordCardProps) {
  const date = new Date(record.observed_at);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;

  return (
    <Link
      href={`/records/${record.id}`}
      className="block rounded-lg border border-forest-700 bg-forest-800 p-3 hover:bg-forest-700 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-forest-100 text-sm truncate">
              {record.mushroom_name_ja || '不明な種'}
            </span>
            <span className={`shrink-0 text-[10px] rounded-full px-1.5 py-0.5 font-bold text-white ${record.harvested ? 'bg-forest-500' : 'bg-blue-600'}`}>
              {record.harvested ? '採取' : '観察'}
            </span>
          </div>
          <div className="text-xs text-forest-400 space-y-0.5">
            <div>{dateStr}</div>
            {record.location.description && <div>{record.location.description}</div>}
            {record.quantity && <div>{record.quantity}</div>}
          </div>
        </div>
        <span className="text-forest-500 text-sm">→</span>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Implement Records list page**

Replace `src/app/records/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { RecordCard } from '@/components/records/RecordCard';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useRecords } from '@/contexts/RecordsContext';
import { UI_TEXT } from '@/constants/ui-text';

type ViewMode = 'list' | 'map';

export default function RecordsPage() {
  const { records, isLoading } = useRecords();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  return (
    <div>
      <PageHeader title={UI_TEXT.records.title} />

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-forest-500 text-white' : 'bg-forest-800 text-forest-400'}`}
          >
            {UI_TEXT.records.listView}
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === 'map' ? 'bg-forest-500 text-white' : 'bg-forest-800 text-forest-400'}`}
          >
            {UI_TEXT.records.mapView}
          </button>
        </div>
        <Link href="/records/new">
          <Button size="sm">+ {UI_TEXT.records.newRecord}</Button>
        </Link>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : viewMode === 'list' ? (
        records.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <span className="text-4xl block mb-4">📝</span>
            <p className="text-forest-400 mb-4">{UI_TEXT.records.noRecords}</p>
            <Link href="/records/new">
              <Button>+ {UI_TEXT.records.newRecord}</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2 px-4 pb-4">
            {records.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )
      ) : (
        <div className="px-4 py-8 text-center text-forest-400">
          地図ビューは Task 7 で実装
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/components/records/RecordCard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/components/records/RecordCard.tsx src/components/records/RecordCard.test.tsx src/app/records/page.tsx
git commit -m "feat: add records list page with RecordCard and new record button"
```

---

## Task 7: Map View with React-Leaflet

**Files:**
- Create: `src/components/records/RecordMap.tsx`
- Modify: `src/app/records/page.tsx`

- [ ] **Step 1: Create RecordMap component**

`src/components/records/RecordMap.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import type { MushroomRecord } from '@/types/record';

interface RecordMapProps {
  records: MushroomRecord[];
}

export function RecordMap({ records }: RecordMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ records: MushroomRecord[] }> | null>(null);

  useEffect(() => {
    // Dynamic import to avoid SSR issues with Leaflet
    import('./RecordMapInner').then((mod) => setMapComponent(() => mod.RecordMapInner));
  }, []);

  if (!MapComponent) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-forest-800 rounded-lg">
        <span className="text-forest-400">地図を読み込み中...</span>
      </div>
    );
  }

  return <MapComponent records={records} />;
}
```

Create the inner map component:

`src/components/records/RecordMapInner.tsx`:
```typescript
'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MushroomRecord } from '@/types/record';

// Fix default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RecordMapInnerProps {
  records: MushroomRecord[];
}

export function RecordMapInner({ records }: RecordMapInnerProps) {
  const validRecords = records.filter((r) => r.location.lat && r.location.lng);

  const center: [number, number] = validRecords.length > 0
    ? [validRecords[0].location.lat, validRecords[0].location.lng]
    : [36.0, 138.0]; // Japan center

  return (
    <div className="h-[60vh] rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={validRecords.length > 0 ? 10 : 5} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validRecords.map((record) => (
          <Marker key={record.id} position={[record.location.lat, record.location.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{record.mushroom_name_ja || '不明'}</strong>
                <br />
                {record.location.description && <span>{record.location.description}<br /></span>}
                {new Date(record.observed_at).toLocaleDateString('ja-JP')}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 2: Integrate map into Records page**

`src/app/records/page.tsx` の地図プレースホルダーを置換:
```typescript
// import追加
import { RecordMap } from '@/components/records/RecordMap';

// viewMode === 'map' のセクションを置換:
) : (
  <div className="px-4 pb-4">
    {records.length === 0 ? (
      <div className="py-16 text-center">
        <span className="text-4xl block mb-4">🗺</span>
        <p className="text-forest-400">{UI_TEXT.records.noRecords}</p>
      </div>
    ) : (
      <RecordMap records={records} />
    )}
  </div>
)}
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

http://localhost:3000/records にアクセスし:
- リスト/地図の切替ボタンが動作する
- 新規記録ボタンから登録フォームに遷移する
- 記録を登録した後、リストと地図に表示される

- [ ] **Step 4: Commit**

```bash
git add src/components/records/RecordMap.tsx src/components/records/RecordMapInner.tsx src/app/records/page.tsx
git commit -m "feat: add map view with React-Leaflet for record locations"
```

---

## Task 8: Record Detail Page

**Files:**
- Create: `src/app/records/[id]/page.tsx`, `src/app/records/[id]/RecordDetailClient.tsx`

- [ ] **Step 1: Create RecordDetailClient**

`src/app/records/[id]/RecordDetailClient.tsx`:
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { Button } from '@/components/ui/Button';
import { useRecords } from '@/contexts/RecordsContext';
import { getPhotosForRecord } from '@/lib/db';
import { blobToDataUrl } from '@/lib/photo';
import { getMushroomById } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';

export default function RecordDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const { records, removeRecord } = useRecords();
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  const record = records.find((r) => r.id === id);
  const mushroom = record?.mushroom_id ? getMushroomById(record.mushroom_id) : undefined;

  useEffect(() => {
    if (!record) return;
    getPhotosForRecord(record.id).then(async (photos) => {
      const urls = await Promise.all(photos.map((p) => blobToDataUrl(p.blob)));
      setPhotoUrls(urls);
    });
  }, [record]);

  if (!record) {
    return (
      <div>
        <PageHeader title={UI_TEXT.records.title} showBack />
        <p className="px-4 py-8 text-center text-forest-400">記録が見つかりません</p>
      </div>
    );
  }

  const date = new Date(record.observed_at);
  const dateStr = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const handleDelete = async () => {
    if (!window.confirm(UI_TEXT.records.deleteConfirm)) return;
    await removeRecord(record.id);
    router.push('/records');
  };

  return (
    <div>
      <PageHeader title={record.mushroom_name_ja || '採取記録'} showBack />
      <div className="space-y-4 px-4 py-4">
        {/* Photos */}
        {photoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photoUrls.map((url, i) => (
              <div key={i} className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden bg-forest-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`写真 ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Mushroom link */}
        {mushroom && (
          <Link href={`/zukan/${mushroom.id}`} className="flex items-center gap-2 rounded-lg bg-forest-800 p-3 hover:bg-forest-700 transition-colors">
            <span className="text-sm font-medium text-forest-100">{mushroom.names.ja}</span>
            <ToxicityBadge toxicity={mushroom.toxicity} compact />
            <span className="ml-auto text-forest-500 text-xs">図鑑を見る →</span>
          </Link>
        )}

        {/* Details */}
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-forest-400">日時</dt>
            <dd className="text-forest-100">{dateStr}</dd>
          </div>
          {record.location.description && (
            <div>
              <dt className="text-forest-400">場所</dt>
              <dd className="text-forest-100">{record.location.description}</dd>
            </div>
          )}
          <div>
            <dt className="text-forest-400">座標</dt>
            <dd className="text-forest-100">{record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}</dd>
          </div>
          <div>
            <dt className="text-forest-400">種別</dt>
            <dd className="text-forest-100">{record.harvested ? '採取' : '観察のみ'}</dd>
          </div>
          {record.quantity && (
            <div>
              <dt className="text-forest-400">数量</dt>
              <dd className="text-forest-100">{record.quantity}</dd>
            </div>
          )}
          {record.memo && (
            <div>
              <dt className="text-forest-400">メモ</dt>
              <dd className="text-forest-100 whitespace-pre-wrap">{record.memo}</dd>
            </div>
          )}
        </dl>

        {/* Delete */}
        <Button variant="ghost" className="w-full text-red-400 hover:text-red-300" onClick={handleDelete}>
          {UI_TEXT.records.deleteRecord}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create page wrapper**

`src/app/records/[id]/page.tsx`:
```typescript
'use client';

import { useParams } from 'next/navigation';
import RecordDetailClient from './RecordDetailClient';

export default function RecordDetailPage() {
  const params = useParams();
  const id = params.id as string;
  return <RecordDetailClient id={id} />;
}
```

- [ ] **Step 3: Verify in browser**

新規記録を登録し、記録一覧 → 記録詳細 → 削除の一連のフローを確認。

- [ ] **Step 4: Commit**

```bash
git add src/app/records/\[id\]/
git commit -m "feat: add record detail page with photos, mushroom link, and delete"
```

---

## Task 9: Zukan Integration & E2E Tests

**Files:**
- Modify: `src/app/zukan/[id]/ZukanDetailClient.tsx`
- Modify: `src/components/zukan/MushroomDetail.tsx`
- Create: `e2e/records.spec.ts`

- [ ] **Step 1: Add records section to MushroomDetail**

`src/components/zukan/MushroomDetail.tsx` の末尾（similar species セクションの後）に追加:

```typescript
// import追加
import { useRecords } from '@/contexts/RecordsContext';

// コンポーネント内の先頭に追加
const { getRecordsByMushroomId } = useRecords();
const myRecords = getRecordsByMushroomId(mushroom.id);

// similar species セクションの後に追加
{/* 11. My records for this species */}
<div>
  <SectionHeading>{UI_TEXT.zukan.myRecords}</SectionHeading>
  {myRecords.length === 0 ? (
    <p className="text-sm text-forest-400">{UI_TEXT.zukan.noRecords}</p>
  ) : (
    <div className="space-y-2">
      {myRecords.map((record) => (
        <Link
          key={record.id}
          href={`/records/${record.id}`}
          className="block rounded-lg bg-forest-800 p-3 hover:bg-forest-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-forest-100">{new Date(record.observed_at).toLocaleDateString('ja-JP')}</span>
              {record.location.description && (
                <span className="text-forest-400 ml-2">{record.location.description}</span>
              )}
            </div>
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold text-white ${record.harvested ? 'bg-forest-500' : 'bg-blue-600'}`}>
              {record.harvested ? '採取' : '観察'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  )}
</div>
```

- [ ] **Step 2: Write E2E tests for records flow**

`e2e/records.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Records (採取記録)', () => {
  test('shows empty state initially', async ({ page }) => {
    await page.goto('/records');
    await expect(page.getByText('採取記録がありません')).toBeVisible();
  });

  test('navigates to new record form', async ({ page }) => {
    await page.goto('/records');
    await page.click('text=新規記録');
    await expect(page.getByText('日時')).toBeVisible();
    await expect(page.getByText('場所')).toBeVisible();
    await expect(page.getByText('保存')).toBeVisible();
  });

  test('creates a new record and shows in list', async ({ page }) => {
    await page.goto('/records/new');

    // Select mushroom
    await page.selectOption('select', 'matsutake');

    // Fill location description
    await page.fill('input[placeholder*="高尾山"]', 'テスト場所');

    // Fill latitude and longitude
    await page.fill('input[placeholder="緯度"]', '35.6762');
    await page.fill('input[placeholder="経度"]', '139.6503');

    // Save
    await page.click('text=保存');

    // Should redirect to list and show the record
    await expect(page).toHaveURL('/records');
    await expect(page.getByText('マツタケ')).toBeVisible();
    await expect(page.getByText('テスト場所')).toBeVisible();
  });

  test('view toggle between list and map works', async ({ page }) => {
    await page.goto('/records');
    await page.click('text=地図');
    // Map view should be visible (or empty state)
    await page.click('text=リスト');
  });
});
```

- [ ] **Step 3: Run all tests**

```bash
npm test
npm run test:e2e
```

- [ ] **Step 4: Update progress tracker**

`docs/progress.md` のPhase 2セクションを更新:
```markdown
## Phase 2: 記録機能 — 完了
- [x] IndexedDB (Dexie.js) セットアップ
- [x] RecordsContext
- [x] 記録登録フォーム (GPS, 写真, メモ)
- [x] 記録一覧ページ
- [x] 地図表示 (React-Leaflet)
- [x] 図鑑連携 (詳細ページに自分の記録表示)
```

- [ ] **Step 5: Commit**

```bash
git add src/components/zukan/MushroomDetail.tsx src/app/zukan/ e2e/records.spec.ts docs/progress.md
git commit -m "feat: add zukan-records integration and E2E tests for Phase 2"
```

---

## Phase 2 完了条件チェックリスト

| 条件 | 対応するTask |
|---|---|
| GPS付きで採取記録を登録できる | Task 2 (geolocation), Task 5 (form) |
| 記録に写真（複数枚）を添付できる | Task 2 (photo), Task 4 (PhotoPicker), Task 5 (form) |
| 地図上に記録がプロットされる | Task 7 (RecordMap) |
| 図鑑詳細ページに自分の記録が表示される | Task 9 (zukan integration) |
