/**
 * Phase 13-F: v3 → v4 マイグレーション
 *
 * 目的: v1 (300 種) を廃棄し v2 (60 種) で新規構築したことに伴い、
 * 既存ユーザーの IndexedDB 内 bookmarks / records が参照する v1 ID を整合させる。
 *
 * 方針:
 * - bookmarks: mushroom_id が v2 set に無いものは **削除**（参照先消失で表示不可のため）
 * - records: mushroom_id が v2 set に無いものは **null にリセット**
 *   (mushroom_name_ja は保持、ユーザーは MushroomCombobox で再リンク可能)
 *
 * 冪等性: 一度実行されたら migrations テーブルに記録され、再実行されない。
 */
import type { Bookmark } from '@/types/bookmark';
import type { MushroomRecord } from '@/types/record';
import type { MigrationRecord } from '@/types/migration';

export const MIGRATION_ID = 'v3-to-v4';

/** v3-to-v4 マイグレーションが必要とする依存（テスト容易性のため抽出）。 */
export interface MigrationDeps {
  getExistingMigration: (id: string) => Promise<MigrationRecord | undefined>;
  getAllBookmarks: () => Promise<Bookmark[]>;
  removeBookmark: (mushroomId: string) => Promise<void>;
  getAllRecords: () => Promise<MushroomRecord[]>;
  updateRecord: (record: MushroomRecord) => Promise<void>;
  recordMigration: (record: MigrationRecord) => Promise<void>;
}

/**
 * @returns マイグレーション実行記録。すでに実行済の場合はその記録を返す（再実行はしない）。
 */
export async function runV3ToV4Migration(
  validV2Ids: ReadonlySet<string>,
  deps: MigrationDeps
): Promise<MigrationRecord> {
  const existing = await deps.getExistingMigration(MIGRATION_ID);
  if (existing) return existing;

  let bookmarksDeleted = 0;
  const bookmarks = await deps.getAllBookmarks();
  for (const b of bookmarks) {
    if (!validV2Ids.has(b.mushroom_id)) {
      await deps.removeBookmark(b.mushroom_id);
      bookmarksDeleted++;
    }
  }

  let recordsReset = 0;
  const records = await deps.getAllRecords();
  for (const r of records) {
    if (r.mushroom_id && !validV2Ids.has(r.mushroom_id)) {
      await deps.updateRecord({ ...r, mushroom_id: undefined });
      recordsReset++;
    }
  }

  const result: MigrationRecord = {
    id: MIGRATION_ID,
    ranAt: new Date().toISOString(),
    bookmarksDeleted,
    recordsReset,
  };
  await deps.recordMigration(result);
  return result;
}
