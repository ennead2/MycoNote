# データソース・クレジット

MycoNote が外部ソースから取り込んでいるデータの一覧と、それぞれのライセンス・出典。

## 学名・分類体系

### GBIF Backbone Taxonomy
- URL: https://www.gbif.org/
- ライセンス: CC0 (Public Domain)
- 用途: 学名の accepted name 解決、シノニム列挙、分類階層（order/family/genus）
- API: `https://api.gbif.org/v1/species/match`, `/species/{key}`, `/species/{key}/synonyms`
- スクリプト: `scripts/gbif-resolve.mjs`

## 和名

### 日本産菌類集覧 和名リスト（日本菌学会）
- URL: https://www.mycology-jp.org/html/checklist_wlist.html
- 原典: Katsumoto, K. (2010) List of fungi recorded in Japan
- ライセンス: **CC BY 4.0** (日本菌学会, The Mycological Society of Japan)
- 用途: 和名と学名の国内正式対応、検証フェーズでの裏取り
- 取り込み: `data/jp-mycology-checklist.json` (4429 種)
- スクリプト: `scripts/import-jp-mycology-checklist.mjs`

## 記述テキスト

### Wikipedia（日本語版 / 英語版）
- URL: https://ja.wikipedia.org/ / https://en.wikipedia.org/
- ライセンス: **CC BY-SA 4.0**
- 用途: 図鑑の description / features を拡充する際の参照
- 出典記録: 各種の `source_url` フィールドに記録

### kinoco-zukan.net
- URL: https://kinoco-zukan.net/
- 用途: 和名・学名・特徴テキストのクロスリファレンス

## 写真

### Wikimedia Commons
- ライセンス: 各写真ごとに CC BY / CC BY-SA / Public Domain
- 用途: 代表写真（`image_local`）

### iNaturalist
- URL: https://www.inaturalist.org/
- ライセンス: 各写真ごとに個別に確認（CC-BY / CC-BY-SA / CC-BY-NC のみ使用）
- 用途: 野外追加写真（`images_remote`）
- 撮影者クレジット: `images_remote_credits[]` に記録

## 外部ライブラリ・アイコン

### lucide-react
- ライセンス: ISC
- 用途: UI アイコン

### Leaflet / React-Leaflet
- ライセンス: BSD-2-Clause / MIT
- 用途: 採取記録地図

## 謝辞

本プロジェクトの図鑑データは、上記ソースの公開データと日本菌学会・Wikipedia 編集者・iNaturalist コントリビュータの継続的な努力の上に成り立っています。
