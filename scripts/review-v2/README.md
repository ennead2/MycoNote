# MycoNote Phase 13-D Review Tool (v2)

Phase 13-C で合成された `generated/articles/*.json` × 62（tier0）を人間判定する dev-only ツール。

## 事前準備（初回のみ）

combined JSON（右パネルのソース表示用）を揃える。`.cache/` は gitignore されているため、worktree から main に戻った場合などは再生成が必要。

```bash
node scripts/phase13/generate_articles.mjs --prepare
node scripts/phase13/fetch_tier0_sources.mjs
```

combined JSON がない種は「情報なし」で審査画面を表示するので、この手順はスキップ可能。

## 起動

```bash
node scripts/review-v2/server.mjs
# → http://localhost:3031 を Chrome で開く
```

## フロー

1. 画面上部に 62 種の進捗バーが表示される
2. 未判定の最初の種から順に表示
3. 1 種ごとに判定:

| キー | 判定 | 意味 |
|---|---|---|
| `1` | approve | 採用可、本番投入 OK |
| `2` | concern | 一部問題あり（セクション選択 + メモ入力） |
| `3` | reject | 全面再生成が必要 |
| `0` | クリア | 判定取消 |
| `N` | メモ欄フォーカス | |
| `G` | Google 画像検索を新タブで開く | |
| `Enter` / `→` | 次の種へ | |
| `←` | 前の種へ | |

4. approve 判定された記事は `generated/articles/approved/<slug>.json` に自動コピーされる
5. 判定履歴は `scripts/temp/review-v2-progress.json` に autosave（途中終了 → 再起動で継続）

## 出力

- `scripts/temp/review-v2-progress.json` — 判定履歴（autosave）
- `generated/articles/approved/<slug>.json` — approve 済み記事のコピー（Phase 13-F の入力）
