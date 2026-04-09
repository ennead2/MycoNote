# Phase 5a: エクスポート/インポート — 設計書

> MycoNote Phase 5a 設計リファレンス
> Version 1.0 — 2026-04-10

---

## 1. 概要

採取記録とチャット履歴を単一のJSONファイルとしてエクスポート・インポートする機能を追加する。データの完全なバックアップと端末間の移行を可能にする。

### スコープ

| 含まれる | 含まれない |
|---------|-----------|
| 採取記録のエクスポート/インポート | CSV形式 |
| チャット履歴のエクスポート/インポート | 設定データ（APIキー等） |
| 写真データの選択的エクスポート（Base64） | ZIP圧縮 |
| バリデーション・重複スキップ | |
| インポート結果サマリー | |

---

## 2. エクスポートデータフォーマット

```typescript
interface ExportData {
  version: 1;
  exported_at: string;              // ISO 8601
  app_version: string;              // "v0.2.0"
  records: MushroomRecord[];
  photos?: ExportPhoto[];           // 写真含む場合のみ
  chatSessions: ChatSession[];
}

interface ExportPhoto {
  record_id: string;
  id: string;
  data: string;                     // Base64エンコード
  media_type: string;               // "image/jpeg" 等
}
```

- ファイル名: `myconote-backup-YYYY-MM-DD.json`
- ライブラリ不使用: `<a download>` + `URL.createObjectURL(blob)` でダウンロード

---

## 3. エクスポート機能

### UIフロー

設定画面のデータ管理セクション:
1. 「データをエクスポート」ボタン
2. 「写真を含める」チェックボックス（デフォルトON）
3. タップ → JSON生成 → ブラウザのダウンロードダイアログ

### 処理フロー

1. IndexedDBから全レコード・全チャットセッションを読み出し
2. 「写真を含める」がONの場合、IndexedDBから全写真Blobを読み出し、Base64変換
3. `ExportData` オブジェクトを構築
4. `JSON.stringify` → `Blob` → `URL.createObjectURL` → `<a download>` でダウンロード
5. 生成中はプログレス表示（「エクスポート中... 写真を変換中 3/12」）

---

## 4. インポート機能

### UIフロー

設定画面のデータ管理セクション:
1. 「データをインポート」ボタン
2. タップ → ファイル選択ダイアログ（`.json`）
3. バリデーション → 確認ダイアログ（「レコード7件・チャット3件・写真12枚をインポートしますか？」）
4. インポート実行 → 結果サマリー表示

### バリデーション

- `version` フィールドが存在し、対応バージョン（1）であること
- `records` が配列であること
- 各レコードに必須フィールド（`id`, `observed_at`, `location`）が存在すること
- `chatSessions` が配列であること（空でもOK）

### 重複処理

- 同一IDのレコード/セッションが既に存在する場合はスキップ（上書きしない）
- インポート完了後に結果サマリーを表示:「レコード 5件追加（2件スキップ）、チャット 3件追加」

### エラーハンドリング

| エラー | メッセージ |
|--------|----------|
| JSONパース失敗 | ファイル形式が不正です |
| バージョン不一致 | このバージョンのバックアップファイルには対応していません |
| バリデーション失敗 | データ形式が不正です。正しいバックアップファイルを選択してください |

---

## 5. ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 新規 | `src/types/export.ts` | `ExportData`, `ExportPhoto` 型定義 |
| 新規 | `src/lib/export-import.ts` | エクスポート/インポートのロジック |
| 新規 | `src/lib/export-import.test.ts` | ロジックのテスト |
| 変更 | `src/constants/ui-text.ts` | エクスポート/インポート用テキスト |
| 変更 | `src/app/settings/page.tsx` | データ管理セクション追加 |
| 新規 | `e2e/phase5-export-import.spec.ts` | E2Eテスト |

---

## 6. テスト方針

### ユニットテスト (`export-import.test.ts`)

- `buildExportData`: レコード + チャットが正しいフォーマットで出力される
- `buildExportData` (写真込み): Base64変換された写真が含まれる
- `validateImportData`: 正しいデータ → valid
- `validateImportData`: version不一致 → エラー
- `validateImportData`: records不正 → エラー
- `importData`: 新規レコードがDBに追加される
- `importData`: 重複IDがスキップされる
- `importData`: 写真データがIndexedDBに復元される

### E2Eテスト

- 設定画面にエクスポート/インポートボタンが表示される
- エクスポートボタンが動作する（ダウンロード開始）

---

## 7. 完了条件

- [ ] 採取記録をJSONでエクスポートできる
- [ ] エクスポートしたデータをインポートして復元できる
- [ ] 写真の有無を選択してエクスポートできる
- [ ] チャット履歴がエクスポート/インポートに含まれる
- [ ] 重複データがスキップされる
- [ ] インポート後に結果サマリーが表示される
- [ ] 全テストがパスする
