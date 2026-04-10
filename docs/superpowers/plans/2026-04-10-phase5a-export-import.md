# Phase 5a: エクスポート/インポート 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 採取記録・チャット履歴・写真を単一JSONファイルとしてエクスポート/インポートする機能を設定画面に追加する

**Architecture:** `lib/export-import.ts` にエクスポート（DB読み出し→JSON構築→ダウンロード）とインポート（ファイル読み込み→バリデーション→DB書き込み）のロジックを集約。設定画面にデータ管理セクションを追加。外部ライブラリ不使用。

**Tech Stack:** Next.js 16, TypeScript, Dexie.js (IndexedDB), Vitest, Playwright

**設計書:** `docs/superpowers/specs/2026-04-10-phase5a-export-import-design.md`

---

## ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 新規 | `src/types/export.ts` | ExportData, ExportPhoto 型定義 |
| 新規 | `src/lib/export-import.ts` | エクスポート/インポートロジック |
| 新規 | `src/lib/export-import.test.ts` | ロジックのユニットテスト |
| 変更 | `src/constants/ui-text.ts` | エクスポート/インポート用テキスト |
| 変更 | `src/app/settings/page.tsx` | データ管理セクション追加 |
| 新規 | `e2e/phase5-export-import.spec.ts` | E2Eテスト |

---

### Task 1: 型定義とUIテキスト

**Files:**
- Create: `src/types/export.ts`
- Modify: `src/constants/ui-text.ts`

- [ ] **Step 1: ExportData型を作成**

```typescript
// src/types/export.ts
import type { MushroomRecord } from './record';
import type { ChatSession } from './chat';

export interface ExportPhoto {
  record_id: string;
  id: string;
  data: string;        // Base64
  media_type: string;   // "image/jpeg" 等
}

export interface ExportData {
  version: 1;
  exported_at: string;
  app_version: string;
  records: MushroomRecord[];
  photos?: ExportPhoto[];
  chatSessions: ChatSession[];
}

export interface ImportResult {
  recordsAdded: number;
  recordsSkipped: number;
  chatSessionsAdded: number;
  chatSessionsSkipped: number;
  photosAdded: number;
}
```

- [ ] **Step 2: UIテキストを追加**

`src/constants/ui-text.ts` の `settings` セクション末尾（`apiKeyGetLink` の後）に以下を追加:

```typescript
dataSection: 'データ管理',
exportButton: 'データをエクスポート',
exportIncludePhotos: '写真を含める',
exporting: 'エクスポート中...',
exportingPhotos: '写真を変換中',
exportComplete: 'エクスポートが完了しました',
importButton: 'データをインポート',
importing: 'インポート中...',
importConfirm: 'をインポートしますか？',
importComplete: 'インポートが完了しました',
importRecords: 'レコード',
importChats: 'チャット',
importPhotos: '写真',
importAdded: '件追加',
importSkipped: '件スキップ',
importErrorFormat: 'ファイル形式が不正です',
importErrorVersion: 'このバージョンのバックアップファイルには対応していません',
importErrorInvalid: 'データ形式が不正です。正しいバックアップファイルを選択してください',
```

- [ ] **Step 3: コンパイル確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx tsc --noEmit 2>&1 | head -10`
Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/types/export.ts src/constants/ui-text.ts
git commit -m "feat: add export/import type definitions and UI text"
```

---

### Task 2: エクスポート/インポートロジック

**Files:**
- Create: `src/lib/export-import.ts`
- Create: `src/lib/export-import.test.ts`

- [ ] **Step 1: テストを作成**

```typescript
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
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/lib/export-import.test.ts 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: エクスポート/インポートロジックを実装**

```typescript
// src/lib/export-import.ts
import { db, getAllRecords, addRecord, addPhoto } from './db';
import { getAllChatSessions, addChatSession } from './db-chat';
import type { ExportData, ExportPhoto, ImportResult } from '@/types/export';
import type { MushroomRecord } from '@/types/record';
import type { RecordPhoto } from '@/types/record';

const CURRENT_VERSION = 1;
const APP_VERSION = 'v0.2.0';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = () => reject(new Error('Blob読み取り失敗'));
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mediaType: string): Blob {
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    array[i] = bytes.charCodeAt(i);
  }
  return new Blob([array], { type: mediaType });
}

export async function buildExportData(
  includePhotos: boolean,
  onProgress?: (message: string) => void,
): Promise<ExportData> {
  const records = await getAllRecords();
  const chatSessions = await getAllChatSessions();

  const data: ExportData = {
    version: CURRENT_VERSION,
    exported_at: new Date().toISOString(),
    app_version: APP_VERSION,
    records,
    chatSessions,
  };

  if (includePhotos) {
    const allPhotos = await db.record_photos.toArray();
    const exportPhotos: ExportPhoto[] = [];

    for (let i = 0; i < allPhotos.length; i++) {
      const photo = allPhotos[i];
      onProgress?.(`写真を変換中 ${i + 1}/${allPhotos.length}`);
      const base64 = await blobToBase64(photo.blob);
      exportPhotos.push({
        record_id: photo.record_id,
        id: photo.id,
        data: base64,
        media_type: photo.blob.type || 'image/jpeg',
      });
    }

    data.photos = exportPhotos;
  }

  return data;
}

export function downloadExportFile(data: ExportData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `myconote-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function validateImportData(data: unknown): { valid: true; data: ExportData } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'ファイル形式が不正です' };
  }

  const d = data as Record<string, unknown>;

  if (!('version' in d) || typeof d.version !== 'number') {
    return { valid: false, error: 'このバージョンのバックアップファイルには対応していません' };
  }

  if (d.version !== CURRENT_VERSION) {
    return { valid: false, error: 'このバージョンのバックアップファイルには対応していません' };
  }

  if (!Array.isArray(d.records)) {
    return { valid: false, error: 'データ形式が不正です。正しいバックアップファイルを選択してください' };
  }

  for (const r of d.records) {
    if (!r || typeof r !== 'object' || !('id' in r) || !('observed_at' in r) || !('location' in r)) {
      return { valid: false, error: 'データ形式が不正です。正しいバックアップファイルを選択してください' };
    }
  }

  if (!Array.isArray(d.chatSessions)) {
    return { valid: false, error: 'データ形式が不正です。正しいバックアップファイルを選択してください' };
  }

  return { valid: true, data: data as ExportData };
}

export function parseImportFile(jsonString: string): { valid: true; data: ExportData } | { valid: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString);
    return validateImportData(parsed);
  } catch {
    return { valid: false, error: 'ファイル形式が不正です' };
  }
}

export async function importData(data: ExportData): Promise<ImportResult> {
  const result: ImportResult = {
    recordsAdded: 0,
    recordsSkipped: 0,
    chatSessionsAdded: 0,
    chatSessionsSkipped: 0,
    photosAdded: 0,
  };

  // Import records
  for (const record of data.records) {
    const existing = await db.records.get(record.id);
    if (existing) {
      result.recordsSkipped++;
    } else {
      await addRecord(record);
      result.recordsAdded++;
    }
  }

  // Import chat sessions
  for (const session of data.chatSessions) {
    const existing = await db.chatSessions.get(session.id);
    if (existing) {
      result.chatSessionsSkipped++;
    } else {
      await addChatSession(session);
      result.chatSessionsAdded++;
    }
  }

  // Import photos
  if (data.photos) {
    for (const photo of data.photos) {
      const existing = await db.record_photos.get(photo.id);
      if (!existing) {
        const blob = base64ToBlob(photo.data, photo.media_type);
        const photoRecord: RecordPhoto = {
          id: photo.id,
          record_id: photo.record_id,
          blob,
          created_at: new Date().toISOString(),
        };
        await db.record_photos.add(photoRecord);
        result.photosAdded++;
      }
    }
  }

  return result;
}
```

- [ ] **Step 4: テストがパスすることを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/lib/export-import.test.ts 2>&1 | tail -15`
Expected: Tests passed

- [ ] **Step 5: コミット**

```bash
git add src/lib/export-import.ts src/lib/export-import.test.ts
git commit -m "feat: add export/import logic with validation and duplicate handling"
```

---

### Task 3: 設定画面にデータ管理セクション追加

**Files:**
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: 設定画面にデータ管理セクションを追加**

`src/app/settings/page.tsx` を変更する。importを追加し、データ管理セクションをAPIキーセクションとアプリ情報セクションの間に挿入する。

まず、ファイル先頭のimportに追加:

```typescript
import { buildExportData, downloadExportFile, parseImportFile, importData } from '@/lib/export-import';
import type { ImportResult } from '@/types/export';
```

次に、コンポーネント内のstate宣言部分（`const [connectionStatus, setConnectionStatus]` の後）に追加:

```typescript
const [includePhotos, setIncludePhotos] = useState(true);
const [isExporting, setIsExporting] = useState(false);
const [exportProgress, setExportProgress] = useState('');
const [isImporting, setIsImporting] = useState(false);
const [importResult, setImportResult] = useState<ImportResult | null>(null);
const [importError, setImportError] = useState<string | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);
```

`useRef` をimportに追加: `import { useState, useEffect, useRef } from 'react';`

次に、ハンドラー関数を追加（`handleDelete` の後に）:

```typescript
const handleExport = async () => {
  setIsExporting(true);
  setExportProgress(UI_TEXT.settings.exporting);
  try {
    const data = await buildExportData(includePhotos, (msg) => setExportProgress(msg));
    downloadExportFile(data);
    setExportProgress(UI_TEXT.settings.exportComplete);
  } catch {
    setExportProgress(UI_TEXT.common.error);
  } finally {
    setIsExporting(false);
  }
};

const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';

  setImportError(null);
  setImportResult(null);

  const text = await file.text();
  const parsed = parseImportFile(text);

  if (!parsed.valid) {
    setImportError(parsed.error);
    return;
  }

  const data = parsed.data;
  const recordCount = data.records.length;
  const chatCount = data.chatSessions.length;
  const photoCount = data.photos?.length ?? 0;

  const summary = `${UI_TEXT.settings.importRecords} ${recordCount}件・${UI_TEXT.settings.importChats} ${chatCount}件${photoCount > 0 ? `・${UI_TEXT.settings.importPhotos} ${photoCount}枚` : ''}${UI_TEXT.settings.importConfirm}`;
  if (!confirm(summary)) return;

  setIsImporting(true);
  try {
    const result = await importData(data);
    setImportResult(result);
  } catch {
    setImportError(UI_TEXT.common.error);
  } finally {
    setIsImporting(false);
  }
};
```

最後に、JSXのAPIキーセクション(`</section>`)とアプリ情報セクションの間に以下を追加:

```tsx
{/* データ管理 */}
<section className="rounded-lg border border-forest-700 bg-forest-800 p-4">
  <h2 className="mb-3 text-sm font-bold text-forest-300">{UI_TEXT.settings.dataSection}</h2>

  {/* エクスポート */}
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2">
      <input
        type="checkbox"
        id="include-photos"
        checked={includePhotos}
        onChange={(e) => setIncludePhotos(e.target.checked)}
        className="rounded border-forest-600 bg-forest-900 text-forest-500"
      />
      <label htmlFor="include-photos" className="text-xs text-forest-400">
        {UI_TEXT.settings.exportIncludePhotos}
      </label>
    </div>
    <Button
      variant="primary"
      size="sm"
      onClick={handleExport}
      disabled={isExporting}
      className="w-full"
    >
      {isExporting ? exportProgress : UI_TEXT.settings.exportButton}
    </Button>
  </div>

  {/* インポート */}
  <div>
    <Button
      variant="secondary"
      size="sm"
      onClick={() => fileInputRef.current?.click()}
      disabled={isImporting}
      className="w-full"
    >
      {isImporting ? UI_TEXT.settings.importing : UI_TEXT.settings.importButton}
    </Button>
    <input
      ref={fileInputRef}
      type="file"
      accept=".json"
      className="hidden"
      onChange={handleImportFile}
    />
  </div>

  {/* インポート結果 */}
  {importResult && (
    <div className="mt-3 rounded-md bg-forest-900 p-3 text-xs text-forest-300">
      <p className="font-bold mb-1">{UI_TEXT.settings.importComplete}</p>
      <p>{UI_TEXT.settings.importRecords}: {importResult.recordsAdded}{UI_TEXT.settings.importAdded}（{importResult.recordsSkipped}{UI_TEXT.settings.importSkipped}）</p>
      <p>{UI_TEXT.settings.importChats}: {importResult.chatSessionsAdded}{UI_TEXT.settings.importAdded}（{importResult.chatSessionsSkipped}{UI_TEXT.settings.importSkipped}）</p>
      {importResult.photosAdded > 0 && (
        <p>{UI_TEXT.settings.importPhotos}: {importResult.photosAdded}{UI_TEXT.settings.importAdded}</p>
      )}
    </div>
  )}

  {/* インポートエラー */}
  {importError && (
    <div className="mt-3 rounded-md bg-red-900/30 border border-red-800 p-3 text-xs text-red-300">
      {importError}
    </div>
  )}
</section>
```

- [ ] **Step 2: ビルド確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build 2>&1 | tail -20`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/settings/page.tsx
git commit -m "feat: add data export/import section to settings page"
```

---

### Task 4: 全テスト通過確認

**Files:** なし

- [ ] **Step 1: 全ユニットテスト実行**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run 2>&1 | tail -15`
Expected: ALL TESTS PASSED

- [ ] **Step 2: ビルド確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build 2>&1 | tail -20`
Expected: ビルド成功

- [ ] **Step 3: 問題があれば修正してコミット**

---

### Task 5: E2Eテスト

**Files:**
- Create: `e2e/phase5-export-import.spec.ts`

- [ ] **Step 1: E2Eテストを作成**

```typescript
// e2e/phase5-export-import.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 5a: エクスポート/インポート', () => {
  test('設定画面にデータ管理セクションが表示される', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByText('データ管理')).toBeVisible();
    await expect(page.getByRole('button', { name: /エクスポート/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /インポート/ })).toBeVisible();
  });

  test('写真を含めるチェックボックスが表示される', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByLabel(/写真を含める/)).toBeVisible();
    await expect(page.getByLabel(/写真を含める/)).toBeChecked();
  });

  test('エクスポートボタンをクリックするとダウンロードが開始される', async ({ page }) => {
    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /エクスポート/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/myconote-backup-\d{4}-\d{2}-\d{2}\.json/);
  });

  test('不正なファイルをインポートするとエラーが表示される', async ({ page }) => {
    await page.goto('/settings');
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    const buffer = Buffer.from('invalid json content');
    await fileInput.setInputFiles({
      name: 'bad-file.json',
      mimeType: 'application/json',
      buffer,
    });
    await expect(page.getByText(/ファイル形式が不正です/)).toBeVisible();
  });
});
```

- [ ] **Step 2: E2Eテスト実行**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build && npx playwright test e2e/phase5-export-import.spec.ts 2>&1 | tail -20`
Expected: ALL TESTS PASSED

- [ ] **Step 3: コミット**

```bash
git add e2e/phase5-export-import.spec.ts
git commit -m "test: add Phase 5a export/import E2E tests"
```

---

### Task 6: 進捗更新

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: progress.md の Phase 5 セクションを更新**

```markdown
## Phase 5: 仕上げ

### 5a: エクスポート/インポート — 完了 (2026-04-10)
- [x] ExportData型定義
- [x] エクスポートロジック (JSON + 写真Base64)
- [x] インポートロジック (バリデーション + 重複スキップ)
- [x] 設定画面データ管理セクション
- [x] E2Eテスト

### 5b: パフォーマンス最適化 — 未着手
- [ ] Lighthouseスコア改善

### 5c: 図鑑データ拡充 — 未着手
- [ ] 100種に拡充
```

- [ ] **Step 2: コミット**

```bash
git add docs/progress.md
git commit -m "docs: update progress tracker — Phase 5a complete"
```
