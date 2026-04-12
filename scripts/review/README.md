# MycoNote Review Tool

Phase 12-F 全 279 種の手動確認を半自動化するための dev-only ツール。

## 事前準備（1 回だけ）

```bash
# 全種の Wikipedia / kinoco-zukan を事前取得（約 15 分）
node scripts/prefetch-review-data.mjs
```

生成物:
- `scripts/temp/review-cache.json` — 説明比較用のキャッシュ

## レビュー起動

```bash
node scripts/review/server.mjs
# → http://localhost:3030 を Chrome で開く
```

## フロー

1. 画面の **「開始」** ボタンをクリック
2. Chrome が 2 タブを自動で開く（和名 / 学名の Google 画像検索）
3. 2 タブを好きな位置に配置（以降はその位置のまま中身が更新される）
4. 1 種ごとに判定:

| キー | 判定 | 意味 |
|---|---|---|
| `1` | ok | 問題なし |
| `2` | replace_image | 画像を差し替えたい |
| `3` | concern | 説明・学名・和名に要修正あり（メモ必須推奨） |
| `4` | delete | 架空種・誤データなので図鑑から削除 |
| `5` | hold | 保留（後でもう一度見る） |
| `0` | クリア | この種の判定を取り消し |
| `N` | メモ欄フォーカス | |
| `Enter` / `→` | 次の種へ | |
| `←` | 前の種へ | |

判定は即座に `scripts/temp/review-progress.json` に書き込まれる。
ブラウザを閉じても次回起動時に再開できる。

## 再開

`/admin/review` を再度開く → 「開始」を押すと**最初の未判定種**から再開。
上部のジャンプセレクタで任意の種にも飛べる。

## 反映

全レビューが終わったら:

```bash
# プレビュー（何が削除・修正されるか確認）
node scripts/apply-review-decisions.mjs --dry-run

# 実適用
node scripts/apply-review-decisions.mjs
```

これにより:
- `delete` 判定の種を `mushrooms.json` から削除
- 削除種を参照している `similar_species[]` を自動クリーン
- `docs/removed-species.md` に削除ログ
- `docs/image-review.md` に画像差替リスト
- `docs/review-concerns.md` に要修正リスト

## 画像検索タブ／ウィンドウの挙動

- 「開始」クリック時に、**2 つの popup ウィンドウ**（和名検索 / 学名検索）が別ウィンドウとして開く
  - 初回は `popup=1,width=720,height=900` 指定で作成され、Review Tool 本体とは別ウィンドウになる
  - 好きな位置に配置すれば以降その位置のまま中身だけ navigate される
- 「次へ」「前へ」「ジャンプ」操作のたびに、同名の popup ウィンドウに対して URL を上書き（named target 再利用）
- popup ウィンドウは閉じても再度「次へ」で再オープンされる

### 初回にポップアップが 1 つしか開かない場合

Chrome の popup blocker が 2 つ目をブロックすることがあります。以下のいずれかで解消:

1. URL バー右端の popup blocker アイコン（🚫🪟）をクリック → 「常に localhost からの popup を許可」
2. `chrome://settings/content/popups` → 「localhost:3030」を許可リストに追加

許可後は「開始」をもう一度クリック（または単に次の種へ進めばそこで 2 つ目も開く）。

## トラブルシュート

- **新規タブが毎回増える**: Chrome が user activation を失ったケース。app.js は `window.open` を必ず click/key ハンドラ内で await 前に同期的に呼んでいるので通常は発生しないが、もし起きたら一度「開始」画面に戻って再開するとリセットされる
- **Review Tool と同じウィンドウ内に新規タブが開いてしまう**: popup features が効いていない → ブラウザのポップアップブロッカーを確認、もしくは別ブラウザ（Chrome/Edge を推奨）で再試行
- **タブを誤って閉じた**: 「次へ」を押すと自動で再オープン
- **画像がロードされない**: iNaturalist の画像は外部 URL 直接読込、オフライン時は X 表示になる
- **port 競合**: `PORT=3031 node scripts/review/server.mjs` で変更可
