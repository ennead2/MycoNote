/** IndexedDB 内の migrations テーブルに格納される 1 マイグレーションの実行記録。 */
export interface MigrationRecord {
  /** マイグレーション識別子 (例: 'v3-to-v4') */
  id: string;
  /** ISO 8601 実行日時 */
  ranAt: string;
  /** v2 に存在しない mushroom_id を持っていたため削除された栞の件数 */
  bookmarksDeleted: number;
  /** v2 に存在しない mushroom_id を持っていたため null にリセットされた記録の件数 */
  recordsReset: number;
}
