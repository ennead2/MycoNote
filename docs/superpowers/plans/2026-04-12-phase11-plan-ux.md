# Phase 11: 採取計画画面の UX/デザイン統一

作成日: 2026-04-12
対象: `src/app/plan/**`, `src/components/plan/**`, `src/app/settings/page.tsx`, 絵文字置換ユーティリティ

## 背景

実機ユーザーテストで以下の問題/改善要望が挙がった:

1. 履歴画面の「戻る」ボタンが `router.back()` 動作のため、計画ホームに戻らず直前画面に戻ってしまう
2. 「探したいキノコ」の UI が `<select>` のまま、記録画面の combobox と統一されていない
3. 「チャット履歴」という名称が用途に合っていない
4. 履歴を開いた瞬間 / メッセージ返信直後に入力欄が自動フォーカスされ、キーボードで画面が隠れる
5. 計画画面・履歴画面・アシスタントラベル・設定画面に絵文字アイコンが残っており Phase 9 デザインガードレール（lucide-react 統一）違反
6. アシスタント返答内の絵文字を lucide 風に置換したい（Claude 出力由来）

## ゴール

- 計画機能の操作フローが直感的であること（戻るで必ず計画ホーム、キーボードで画面が隠れない）
- 計画機能の UI が Phase 9 ガードレールに完全準拠（絵文字 → lucide、パレットトークン、共通コンポーネント再利用）
- 「探したいキノコ」入力が記録画面と同じ combobox 体験、かつ図鑑データ追加に自動追従

## 決定事項（ユーザー確認済み）

| 項目 | 決定 |
|---|---|
| 履歴セクション名 | 「採取計画の履歴」 |
| キノコ候補対象 | 全300種、`searchMushrooms()` 参照で将来追加自動追従 |
| 予定日カレンダー | ネイティブ `<input type="date">` + CSS スタイル調整 |
| 絵文字置換 | 実施する（頻出 10〜15 個辞書方式） |
| 作業順 | 11-A1 → 11-D → 11-E → 11-C → 11-B1 → 11-B2 → 11-F |
| コミット粒度 | 各 Step で小刻みにコミット |

## Steps

### 11-A1: 履歴画面の戻るを計画ホームへ

**File**: `src/app/plan/page.tsx`

`view === 'history'` ブロックの `PageHeader title={...} showBack` を撤去し、`view === 'chat'` と同じパターンの sticky ヘッダに `ArrowLeft` ボタンで `setView('form')` を発火させる。

**受け入れ条件**:
- 履歴画面の `←` タップで必ず計画ホーム（form view）に戻る
- ブラウザ戻るボタンは従来通り（PWA の履歴に従う）

**コミット**: `fix(plan): history back button returns to plan home`

---

### 11-D: ChatInput の自動フォーカス解除

**File**: `src/components/plan/ChatInput.tsx`

`useEffect(() => { if (!disabled) inputRef.current?.focus(); }, [disabled]);` を削除。ユーザーがタップした時だけ focus する。

**受け入れ条件**:
- 履歴から開いた直後、キーボードが出ない
- メッセージ返信完了直後、キーボードが出ない
- 入力欄を明示的にタップすれば従来通り入力できる
- 送信ボタンで送信した後も、入力欄は blur 状態（連投ケースは稀なので UX 優先）

**コミット**: `fix(plan): stop auto-focusing chat input on view change`

---

### 11-E: 絵文字 → lucide-react 一括置換

#### 11-E1: PlanForm 絵文字置換

**File**: `src/components/plan/PlanForm.tsx`

| before | after (lucide) |
|---|---|
| 📅 予定日 | `Calendar` |
| 📍 場所 | `MapPin` |
| 🍄 探したい | `Sprout` |
| 🎯 経験レベル | `Target` |
| 🗺 送信ボタン | `Map`（既に Plan ホームで使用中） |

ラベル行を `<span className="inline-flex items-center gap-1.5 text-xs font-bold text-moss-light mb-1">[Icon size={14}] テキスト</span>` パターンへ統一。

**コミット**: `refactor(plan): replace emoji labels with lucide icons in PlanForm`

#### 11-E2: ChatHistory 絵文字置換 + 削除ボタン

**File**: `src/components/plan/ChatHistory.tsx`

| before | after |
|---|---|
| 📍 場所 | `MapPin size={12}` |
| 📅 日付 | `Calendar size={12}` |
| 💬 件数 | `MessageCircle size={12}` |
| 🗑 削除 | `Trash2 size={16}`（ボタン化） |
| + 新規 | `Plus size={16}` |

削除ボタンはテキスト `🗑` から lucide ボタン（`text-washi-dim hover:text-safety-toxic`）へ。

**コミット**: `refactor(plan): replace emoji with lucide icons in ChatHistory`

#### 11-E3: ChatMessage のアシスタントラベル

**File**: `src/components/plan/ChatMessage.tsx`

`🤖 アシスタント` ラベル → `<Sprout size={12} />` + テキスト。モスカラーで統一。

**コミット**: `refactor(plan): replace 🤖 with Sprout icon in assistant label`

#### 11-E4: ChatInput の送信ボタン

**File**: `src/components/plan/ChatInput.tsx`

送信ボタンのテキスト `↑` → `<ArrowUp size={16} />`（lucide）。`bg-moss-primary` でアクセント。

**コミット**: `refactor(plan): use ArrowUp icon for send button`

#### 11-E5: Settings のアイキャップ + チェックボックス

**File**: `src/app/settings/page.tsx`

- `🙈 / 👁` → `EyeOff / Eye`（lucide）
- 「写真を含める」のネイティブ checkbox → カスタムチェックボックス
  - 実装: `<label>` で `<input type="checkbox" class="peer sr-only">` + `<span>` 箱 + `<Check>` アイコン
  - 状態: 未選択=border-washi-dim, 選択=bg-moss-primary border-moss-light + Check 表示
- 必要なら `src/components/ui/Checkbox.tsx` を新設して再利用可能な単位で抽出

**コミット**: `refactor(settings): use lucide Eye icons and custom Checkbox component`

---

### 11-C: 履歴セクションの名称変更

**File**: `src/constants/ui-text.ts`

`plan.historyTitle` / `plan.historyButton` / `plan.chatHistoryNav` を以下に統一:

- `historyTitle`: `'採取計画の履歴'`
- `historyButton`: `'履歴'`（ボタン上は短縮）
- 関連: `newSession`, `noSessions` 等も文脈に合わせて確認

参照箇所を全て更新（BottomNav に「計画履歴」タブがあれば同様）。

**コミット**: `refactor(plan): rename "チャット履歴" to "採取計画の履歴"`

---

### 11-B1: 「探したいキノコ」を Combobox 化

#### 設計

記録側の `MushroomCombobox` は **単一選択**。計画側は **複数選択**必要なので、以下のいずれかで対応:

**採用案**: 既存 `MushroomCombobox` は触らず、計画側専用ラッパー `TargetSpeciesInput` を `src/components/plan/TargetSpeciesInput.tsx` に新設。

- 内部で `MushroomCombobox` を使い、候補選択ごとに `targetSpecies[]` に push → input を空にリセット
- 既存 chip UI（×付きラベル）は流用（`ChipTag` コンポーネントに揃える）
- `searchMushrooms()` 経由なので全300種・将来追加自動追従
- 自由入力（図鑑にない名前）もそのまま追加可能（記録側と同じ挙動）

#### File 変更

- `src/components/plan/TargetSpeciesInput.tsx` 新設
- `src/components/plan/PlanForm.tsx` の該当 `<select>` ブロックを差し替え

#### 記録側の将来追従確認

- `src/data/mushrooms.ts` は `mushrooms.json` を import しており、`searchMushrooms()` は `mushrooms` 配列を都度参照
- → JSON にデータ追加 → ビルド時に反映（再コンパイルのみで OK、コード修正不要）
- 動作確認のため本計画書に「データ追加時の手順」を追記する必要はなし（既存の通り）

**受け入れ条件**:
- 入力中にリアルタイム候補（最大10件）
- 候補クリックで chip 化、同じ種は重複不可
- 入力欄に図鑑にない名前を確定（Enter or 入力後 blur）でも chip 追加可能
- chip の × で削除
- ChipTag コンポーネントを利用（Phase 9 ガードレール準拠）

**コミット**: `feat(plan): target species input uses combobox with 300-species autocomplete`

---

### 11-B2: 予定日カレンダーのスタイル調整

**File**: `src/app/globals.css` + `src/components/plan/PlanForm.tsx`

ネイティブ `<input type="date">` の Phase 9 スタイル化:

```css
input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(0.7) sepia(0.3) saturate(2) hue-rotate(60deg); /* moss tone */
  cursor: pointer;
  opacity: 0.8;
}
input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}
```

input 本体の `bg-soil-surface / border-moss-primary / text-washi-cream / focus:ring-moss-light` は既存通り。placeholder（未入力状態）色もトークン準拠に。

**受け入れ条件**:
- カレンダーアイコンが moss 系色で表示される
- ダークテーマと視覚的に調和する
- iOS Safari でネイティブピッカーが開く（動作に影響なし）

**コミット**: `style(plan): theme native date picker to match Phase 9 palette`

---

### 11-F: アシスタント返答の絵文字置換

#### 設計

Claude の返答に含まれる絵文字を lucide アイコンにインライン置換する。ReactMarkdown の `text` renderer（or 事前前処理）で正規表現ベースに差し替え。

#### 置換辞書（頻出15個を想定）

| 絵文字 | 置換先 lucide | 意味 |
|---|---|---|
| 🍄 | `Sprout` | キノコ/採取 |
| 🌲🌳🌴 | `TreePine` | 樹木 |
| 🍂🍁 | `Leaf` | 落葉 |
| ⚠️ ⚠ | `AlertTriangle` | 注意 |
| ☠️ ☠ | `Skull` | 猛毒 |
| 📍 | `MapPin` | 場所 |
| 📅 | `Calendar` | 日付 |
| ✅ ✔ | `Check` | OK |
| ❌ ✕ | `X` | NG |
| 🌧 ☔ | `CloudRain` | 雨 |
| ☀️ ☀ | `Sun` | 晴 |
| 💡 | `Lightbulb` | ヒント |
| 🔍 | `Search` | 観察 |
| 📸 | `Camera` | 撮影 |
| 🎯 | `Target` | 目標 |

#### 実装

**File**: `src/lib/emoji-to-icon.tsx` 新設

```typescript
// 概略
const EMOJI_MAP: Record<string, { Icon: LucideIcon; tone: string }> = {
  '🍄': { Icon: Sprout, tone: 'text-moss-light' },
  '⚠️': { Icon: AlertTriangle, tone: 'text-safety-caution' },
  // ...
};

export function replaceEmojisWithIcons(text: string): React.ReactNode[] {
  // Unicode regex で絵文字境界分割 → マップ該当なら <Icon size={14} /> に置換
  // 該当なしの絵文字は素通し
}
```

**File**: `src/components/plan/ChatMessage.tsx`

ReactMarkdown の `components.p` / `components.li` / `components.strong` など text を含む要素に、children を再帰走査して `replaceEmojisWithIcons` を適用するラッパーを噛ませる。

**受け入れ条件**:
- 辞書に存在する絵文字は lucide SVG に置換（サイズ 14px、縦ずれなし）
- 辞書外の絵文字はそのまま表示（例: 👍 など）
- ストリーム中でも破綻しない（部分文字列で絵文字境界が途切れても fallback）
- 既存 Markdown レンダリング（見出し・リスト・テーブル）を壊さない
- safety 色のアイコンは `safety-*` トークン（⚠→caution, ☠→toxic）

**コミット**: `feat(plan): replace common emoji in assistant responses with lucide icons`

---

## 検証

各 Step 完了時:

1. `npm run test` (Vitest) — 既存テスト維持
2. `npm run build` — 静的エクスポート成功
3. 実機（または browse skill）で該当画面のスクリーンショット確認
4. CLAUDE.md の Design Guardrails 7 ルール違反がないか目視

最終確認:
- `grep -rn "🍄\|📅\|📍\|🎯\|🗺\|🤖\|💬\|🗑\|🙈\|👁" src/components/plan src/app/plan src/app/settings` で絵文字残存ゼロ（Guardrail 4 の例外: ToxicityBadge の `✓ ⚠ — ☠` のみ許容）
- 全テスト通過、ビルド 293 静的ページ以上

## スコープ外

- 計画画面の URL クエリ同期（11-A2 候補）
- カレンダーのフルカスタム実装
- アシスタント返答のリッチ UI 化（カード・タグ付け）
- 絵文字置換辞書の設定画面化

これらは v2 ロードマップまたは次フェーズで検討。
