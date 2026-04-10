# 図鑑データ作成・検証ワークフロー

> 全てのきのこデータの作成・拡充時にこの手順に従うこと。
> Phase 8d で確立。以降の図鑑拡充でも同じクオリティを維持するために使用する。

---

## 概要

図鑑に掲載する各きのこについて、以下の3ソースから情報を収集し、
クロスリファレンスで検証した上でデータを作成・更新する。

## 情報ソース

| # | ソース | 目的 | エンドポイント/URL |
|---|--------|------|--------------------|
| 1 | **iNaturalist Taxa API** | 学名存在確認、分類階層取得 | `api.inaturalist.org/v1/taxa?q={学名}&rank=species` |
| 2 | **Wikipedia ja/en** | 和名↔学名照合、記事内容取得 | `{lang}.wikipedia.org/w/api.php` (action=query) |
| 3 | **kinoco-zukan.net** | 和名・学名・科名照合、特徴テキスト | `kinoco-zukan.net/{romanized_name}.php` |

## 収集フロー（1種あたり）

```
Step 1: iNaturalist Taxa API
  入力: 学名 (names.scientific)
  取得: taxon_id, 分類階層 (order/family/genus), 観察数, wikipedia_url
  判定: 結果0件 → 学名不正または架空種の可能性 → フラグ

Step 2: Wikipedia ja
  入力: 和名 (names.ja)
  取得: 記事テキスト (extract), 学名 (記事内から抽出), ページURL
  判定: 記事なし → 情報源不足フラグ
        記事の学名と Step 1 の学名が不一致 → 不整合フラグ

Step 3: kinoco-zukan.net
  入力: ID (romanized name)
  取得: 学名, 科名, 特徴テキスト
  判定: ページなし → スキップ (マイナー種では正常)
        学名不一致 → 不整合フラグ

Step 4: 統合・検証
  - 3ソースの学名を照合
  - iNaturalist の分類階層を taxonomy フィールドに設定
  - 不整合があれば verification-issues.md に記録
  - 学名修正が必要な場合は iNaturalist を正とする

Step 5: 記事充実化
  - 収集した情報を元に description を拡充
  - 食用種: cooking_preservation フィールドに調理法・保存方法を記載
  - 毒種: poisoning_first_aid フィールドに中毒事例・応急処置を記載
  - features (形態的特徴) も情報があれば拡充
```

## レート制限

| ソース | 間隔 |
|--------|------|
| iNaturalist | 1.5秒 |
| Wikipedia | 1.5秒 |
| kinoco-zukan.net | 3秒 |
| 1種の合計 | 約6-8秒 |

## 進捗管理

- 進捗ファイル: `scripts/temp/verification-progress.json`
- 各種の処理状態を記録し、中断後も再開可能
- 状態: `pending` → `gathered` → `enriched` → `verified`

## 品質基準

### 必須チェック
- [ ] 学名がiNaturalistに存在すること
- [ ] 和名と学名の対応が正しいこと
- [ ] 学名が既存エントリと重複していないこと（重複 = ハルシネーションの疑い）
- [ ] 分類階層 (taxonomy) が設定されていること
- [ ] description が3文以上であること
- [ ] 食用種に cooking_preservation があること
- [ ] 毒種に poisoning_first_aid があること

### 不整合の扱い
- 学名の不整合 → iNaturalist を正とし修正
- 和名に対応する学名が異なる場合 → verification-issues.md に記録、ユーザー確認
- iNaturalist に存在しない種 → verification-issues.md に「架空種の疑い」として記録

## iNaturalist写真の取得

検証後の正しい学名で写真を再取得する。

- 最大9枚/種、ユーザー分散（ラウンドロビン）
- 撮影者クレジット (images_remote_credits) を付与
- `scripts/fetch-photos-v2.mjs` を使用

## スクリプト

| スクリプト | 用途 |
|-----------|------|
| `scripts/gather-species-data.mjs` | 3ソースからの情報収集 |
| `scripts/fetch-photos-v2.mjs` | Wikipedia/iNaturalist 写真取得 |

## 出力ファイル

| ファイル | 内容 |
|---------|------|
| `scripts/temp/species-raw/{id}.json` | 種ごとの生データ |
| `scripts/temp/verification-progress.json` | 進捗管理 |
| `docs/verification-issues.md` | 不整合・要確認リスト |
