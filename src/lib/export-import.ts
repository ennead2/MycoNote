// src/lib/export-import.ts
import { db, getAllRecords, addRecord, addPhoto } from './db';
import { getAllChatSessions, addChatSession } from './db-chat';
import type { ExportData, ExportPhoto, ImportResult } from '@/types/export';
import type { MushroomRecord } from '@/types/record';
import type { RecordPhoto } from '@/types/record';

const CURRENT_VERSION = 1;
const APP_VERSION = 'v0.2.0';

async function blobToBase64(blob: Blob): Promise<string> {
  // Blob インスタンスかどうか確認し、arrayBuffer メソッドがある場合はそちらを使用
  if (typeof blob.arrayBuffer === 'function') {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // フォールバック: FileReader を使用（ブラウザ環境向け）
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
