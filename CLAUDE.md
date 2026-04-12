# MycoNote Project Instructions

## Project Overview
MycoNote is a mushroom handbook PWA built with Next.js 16 (static export), React 19, Tailwind CSS v4. Currently at Phase 9 (UI/UX improvement).

Key docs:
- Specification: `docs/SPEC.md`
- Progress: `docs/progress.md`
- v2 Roadmap: `docs/superpowers/plans/2026-04-10-v2-roadmap.md`
- Current plan: `docs/superpowers/plans/2026-04-11-phase9-ui-ux.md`
- Design system: `DESIGN.md` (created via /design-consultation)

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

## Design Guardrails（新コード記述時のルール）

新しい UI を書く／既存 UI を修正するときは、以下を**必ず**守ること。逸脱する場合はユーザーに事前確認。

### 1. 色・スペーシング・タイポは DESIGN.md のトークンから選ぶ
- カラー: `moss-*` / `soil-*` / `washi-*` / `safety-*` / `species-*` のトークンのみ使用。Hex 直書きや任意の Tailwind 色（`bg-green-500` など）は不可
- 例外: `images_remote` やチップの色見本など「実色を見せる」用途では Hex 許容
- スペーシング: 4px base unit（`p-1 p-2 p-3 p-4 p-6 p-8 p-12 p-16` = 4/8/12/16/24/32/48/64px）に従う
- タイポ: 見出しは `serif-display`（Noto Serif JP）、学名は `italic`（Inter）、数値/ラベルは `mono-data`（JetBrains Mono）、本文は既定（Noto Sans JP）
- セクションラベル（`"CARA COLOR"` 等）は `mono-data` + `uppercase` + `tracking-wider`

### 2. `forest-*` クラスは使わない（legacy）
- `forest-100/200/300/400/500/700/800` は Phase 9 で legacy remap 済みだが**新色には対応しない**
- 代替: `forest-100` → `washi-cream`、`forest-300/400` → `washi-muted`、`forest-500` → `washi-dim`、`forest-700/800` → `soil-surface`/`soil-elevated`
- 既存 `forest-*` に遭遇した場合、触るついでに新トークンへ移行して良い（ただし Plan C で一括移行する予定なのでスコープ外なら放置可）

### 3. 共通コンポーネントを再利用する（自作で分岐しない）
以下は必ず既存コンポーネントを使う:
- **ToxicityBadge** (`@/components/zukan/ToxicityBadge`) — 毒性表示
- **ColorChip** (`@/components/ui/ColorChip`) — 色情報の視覚チップ
- **Button** (`@/components/ui/Button`) — primary/secondary/ghost
- **LoadingSkeleton** (`@/components/ui/LoadingSkeleton`) — shimmer ローディング
- **LoadingSpinner** (`@/components/ui/LoadingSpinner`) — 円形スピナー
- **PageHeader** (`@/components/layout/PageHeader`) — sticky ヘッダー

同種の UI を自作しない。Button を再実装しない。Skeleton を都度書かない。

### 4. アイコンは lucide-react（絵文字 UI 禁止）
- アイコンは必ず `lucide-react` から import（`import { Map, Search } from 'lucide-react'`）
- `size={20}` or `size={22}`、`strokeWidth={2}`（active は 2.5）を既定
- 例外: `ToxicityBadge` の `✓ ⚠ — ☠` のみ記号扱いで許容
- 本文中の絵文字（文章の一部としての 🍄 等）は可だが、ボタン/ナビ/アイコン UI では使わない

### 5. 安全情報と色情報のパレットは分ける
- **安全性**（毒性・警告・注意）: `safety-edible` / `safety-caution` / `safety-inedible` / `safety-toxic` / `safety-deadly`
- **色情報**（キノコのカサ/ヒダ/柄の色名視覚化）: `species-*` パレット（`src/lib/color-text.tsx` の `COLOR_MAP` 参照）
- この2つを混ぜない（「毒」を赤の species で塗らない、「赤いカサ」を safety-toxic で塗らない）

### 6. 頻出レイアウトは DESIGN.md の Common Patterns に従う
PageShell / SectionHeader / EmptyState / InfoBanner / ChipTag / ScrollCarousel / BentoGrid は DESIGN.md の `## Common Patterns` に定義あり。新規画面の骨格はそこから選ぶ。

### 7. モーションは CSS only
- `animate-shimmer` / `animate-fade-in` / `animate-slide-up` を使う
- Framer Motion 等のライブラリは導入しない
- ホバーは `transition-colors` / `transition-all duration-200` + `hover:-translate-y-0.5` など軽量なもの
