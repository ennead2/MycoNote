# Phase 13 生成ログ

## 2026-04-14 〜 2026-04-15: tier0 batch #1 (N=62)

- モデル: `claude-opus-4-6`
- プロンプト: `docs/superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md` §2.5 準拠（`scripts/phase13/prompt_templates.mjs`）
- 並列度: 5（Claude Code セッション内 Agent ツール）
- 対象: tier0 指名 68 種 → 除外 6 件 → **最終 62 種**
- 出力: `generated/articles/<slug>.json` × 62 件（平均 3.5KB）

### 結果

- 合成成功: **62/62**
- 自動検証 pass: **62 / 62（達成率 100%）**
- needs_regeneration: **0**
- 警告あり（非ブロッキング）: 19 件
  - V8（caution に出典番号 `[N]` が出現しない）: 多数
  - V4（自由文中に学名パターン混入）: 数件
  - いずれも Phase 13-D のレビュー UI で人間判定する対象に委ねる

### 合成の 2 段階実行

| フェーズ | 成功 | needs_regeneration | 主失敗 |
|---|---|---|---|
| Initial | 52/62 | 10 | 全件 V5（season 配列の冬またぎ表現） |
| Retry   | 10/10 | 0  | — |

Initial の 10 件は「晩秋〜早春」「11月〜3月」等を素朴に `{start:11, end:3}` と出力し V5 違反。
Retry ではプロンプトに「冬またぎは 2 分割（例: `{11,12}` と `{1,3}`）」の明示指示を足して全件 pass。

### tier0 確定の経緯（当初 68 → 62）

**名称修正 3 件（tier0 継続）**
- `Pseudosperma_rimosum`: アセタケ → オオキヌハダトマヤタケ
- `Sutorius_venenatus`: ドクヤマドリタケ → ドクヤマドリ
- `Omphalotus_guepiniiformis`: primary 和名をクマヒラ → ツキヨタケ

**tier0 から除外 6 件（tier 1 へ demote）**
- `Inocybe_asterospora` (カブラアセタケ)
- `Inocybe_napipes` (コブミノアセタケ)
- `Amanita_sepiacea` (テングタケモドキ)
- `Entoloma_subrhodopolium` (クサウラベニタケモドキ)
- `Chlorophyllum_neoapicale` (オオシロカラカサタケモドキ)
- `Tylopilus_nigropurpureus` (クロニガイグチ) — ソース極薄のため除外

除外の主因は「5 ソース中 rinya 以外ヒットゼロ」で、curator 側の名称誤りが絡むケースは名称修正で救済、それ以外は tier demote とした。

### 次アクション

- `generated/articles/` の 62 件は Phase 13-D レビュー UI で人間レビュー対象
- 19 件の warning 付き記事は UI で warning バッジを表示予定
- ソース薄で除外された 6 種は Phase 13-G 以降の再生成対象候補
- プロンプトへの「冬またぎ 2 分割」指示の恒常化は `prompt_templates.mjs` の SEASON_SPEC 強化として Phase 13-D 以降で検討
