# Design System — MycoNote

> Created: 2026-04-12 via /design-consultation
> Aesthetic codename: **現代の民藝図鑑** (Modern Mingei Field Guide)

## Product Context

- **What this is:** キノコ採取・観察ハンドブック PWA。安全重視の図鑑・識別・採取記録・採取計画を統合
- **Who it's for:** 日本の里山でキノコ採取を楽しむ個人+友人数名
- **Space/industry:** ネイチャー・フィールドガイド / 種同定
- **Project type:** モバイルファースト PWA (Next.js static export, オフライン対応)
- **Reference research:** iNaturalist, Seek, AllTrails, Merlin, YAMAP, きのこ図鑑.net (2026-04-12 調査)

## Aesthetic Direction

- **Direction:** 現代の民藝図鑑 — 伝統的なきのこ図鑑の情緒と現代のダークモードUIの橋渡し
- **Decoration level:** Intentional — 和紙テクスチャ grain を全体に4% opacity で敷く、派手な装飾はしない
- **Mood:** 「秋の山で、そっと開く小さな図鑑」— 立ち止まって読むテンポ、森の静けさ、安全への敬意
- **Anti-slop:** 紫グラデーション禁止、丸アイコン3列グリッド禁止、過度な中央揃え禁止、絵文字アイコン禁止（UIから）

## Typography

- **Display/Hero:** **Noto Serif JP** 500/700 — 明朝で「図鑑らしさ」を出す、見出し限定
- **Body (Japanese):** **Noto Sans JP** 400/500 — 可読性優先
- **Latin / Scientific names:** **Inter** italic — 学名は *Amanita muscaria* 風
- **Numeric / Mono:** **JetBrains Mono** 400/500 — 座標・日時・ID・メタデータラベル
- **Loading:** `next/font/google` で自動最適化、`display: 'swap'`

### Scale
| Role | Font | Size | Weight |
|------|------|------|--------|
| Hero | Noto Serif JP | 56px / 32px (mobile) | 700 |
| H1 (Detail title) | Noto Serif JP | 28px | 700 |
| H2 (Section) | Noto Serif JP | 22px | 500 |
| H3 (Sub-section) | Noto Serif JP | 16px | 700 |
| Body | Noto Sans JP | 15px | 400 |
| Body small | Noto Sans JP | 13px | 400 |
| Caption | Noto Sans JP | 12px | 400 |
| Latin name | Inter italic | 15px | 400 |
| Mono label | JetBrains Mono | 11-12px | 500 |
| Mono data | JetBrains Mono | 14px | 400 |

### Typographic rules
- 和文見出しには **明朝** を使う（差別化の核）
- 本文は **ゴシック** で可読性確保
- 学名は必ず **イタリック**（*Lentinula edodes*）
- 数値・座標・ID・日時は **等幅フォント**
- セクションラベル（`"CARA COLOR"` 等）は **mono + uppercase + letter-spacing 0.12em**

## Color

### Approach
Balanced — ダーク基調の森/和紙パレット + 安全信号システム

### Base Palette (Dark-first)

| Token | Hex | Role |
|-------|-----|------|
| `--moss-primary` | `#2F5233` | 主要アクション、ブランドアクセント |
| `--moss-light` | `#6BA368` | リンク、アクティブ状態、ハイライト |
| `--moss-dark` | `#1E3621` | 押下状態、濃いアクセント |
| `--soil-bg` | `#0F1410` | body背景（純黒ではなくわずかに緑） |
| `--soil-surface` | `#1A211C` | カード、コンテナ |
| `--soil-elevated` | `#232B25` | モーダル、ポップオーバー、ボトムシート |
| `--washi-cream` | `#EDE3D0` | 主要テキスト（和紙のトーン） |
| `--washi-muted` | `#B8AE98` | セカンダリテキスト |
| `--washi-dim` | `#807663` | プレースホルダー、disabled |
| `--border` | `#2A332C` | 主要区切り線 |
| `--border-soft` | `#232B25` | 微妙な区切り |

### Safety Signal System (毒性 5 段階)

| レベル | Token | Hex | 記号 | 用途 |
|-------|-------|-----|------|------|
| 食用 | `--safety-edible` | `#6BA368` | ✓ | edible |
| 食用要注意 | `--safety-caution` | `#A89554` | ⚠ | caution |
| 不食 | `--safety-inedible` | `#7A7266` | — | inedible |
| 毒 | `--safety-toxic` | `#C26B3F` | ⚠ | toxic |
| 猛毒 | `--safety-deadly` | `#B83A2E` | ☠ | deadly |

- **色+記号** の両方で表現（色覚多様性への配慮）
- 彩度を抑え山の色調に馴染ませる

### Species Color Visualization (図鑑詳細)

**重要な差別化機能:** 種詳細で「色」に関する属性（カサ/ヒダ/柄/肉など）を表示する際、**実際の色を視覚チップで表示する**。

実装要件:
- Bento cell 内の `bento-label = "カサの色"` のような色属性フィールドには、**色名を示す視覚的カラーチップ**（7-10px 角の小さな円/矩形）を値テキストの隣に配置
- 複数色の場合は並置（例: 「赤 / 白いイボ」→ 赤チップ + 白チップ + テキスト）
- 色名→Hex の対応マッピングを定義（赤 `#C43E3E`、白 `#EDE3D0`、黄 `#D4A017`、茶 `#7A4A2A`、紫 `#6B3F6B`、黒 `#2B2420`、灰 `#7A7266`、橙 `#D47337`、緑 `#6BA368`、青 `#3E5A7A`、ピンク `#C17889` 等）
- 色名に修飾（「淡い」「濃い」「~がかった」）がある場合は代表色チップで表示
- この「色の色」視覚化は、他のキノコアプリにない **MycoNote の顔** になる機能

## Spacing

- **Base unit:** 4px
- **Density:** Comfortable — 立ち止まって読むリズム、詰め込まない

### Scale
| Token | Value |
|-------|-------|
| `2xs` | 2px |
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `2xl` | 48px |
| `3xl` | 64px |

### Layout spacing
- Section 間: 48px (2xl)
- Card 内 padding: 16px (md)
- Card 間 gap: 8-12px
- 本文 line-height: 1.7-1.85 (読み物リズム)

## Layout

- **Approach:** Hybrid — 一覧画面はグリッド、種詳細は Bento grid
- **Grid:**
  - Mobile: 2-column species cards, 1-column detail
  - Tablet (768px+): 3-4 column species cards
- **Max content width:** 512px (max-w-lg) for mobile-first optimization
- **Border radius hierarchy:**
  - `sm` 4px (chips, tiny elements)
  - `md` 8px (buttons, inputs)
  - `lg` 10-12px (cards, bento cells)
  - `xl` 16-20px (mockup frames, hero containers)
  - `full` 9999px (badges, avatars)

### Bento Grid (種詳細)
- 2x2 base grid with `wide` (span 2) cells
- 各セルは `label (mono uppercase)` + `value (serif or sans)` 構成
- セル間 gap: 10px
- セル内 padding: 14px

## Motion

- **Approach:** Intentional — CSS only, 軽量第一
- **追加ライブラリ禁止:** Framer Motion 等は導入しない

### Easing
- `enter`: `ease-out`
- `exit`: `ease-in`
- `move`: `ease-in-out`

### Duration
- `micro` 100ms (hover color change)
- `short` 200ms (button press feedback)
- `medium` 300ms (fade-in, card reveal)
- `long` 500ms (page transitions, only if needed)

### Patterns
- ページfade-in: `opacity 0 → 1, translateY(8px → 0)` over 300ms ease-out
- Card hover: `translateY(-2px)` + shadow deepen, 150ms
- Shimmer (loading): 1.5s linear infinite, washi-tone gradient
- 禁止: bouncy easing, expressive choreography, scroll-driven animations

## Iconography

- **Base library:** `lucide-react` (SVG, tree-shakable)
- **Stroke width:** 2 (active: 2.5)
- **Default size:** 20-24px
- **絵文字はUIから全廃** — ToxicityBadge の ✓⚠—☠ のみ例外（記号扱い）
- **将来の拡張:** きのこ特徴（カサ/ヒダ/柄）のカスタムラインイラストを Phase 10+ で検討

## PWA / App Icons

- **Aesthetic:** 民藝 × 現代 — 単純化したきのこシルエット、和紙トーン、森色ベース
- **生成方法:** Gemini (gemini-imagegen) で複数案生成→選定
- **Sizes:** 192x192, 512x512 (maskable), favicon 32x32
- **Theme color:** `--soil-bg` (#0F1410)

## Texture / Background

- **和紙 grain:** SVG noise filter at 4% opacity, applied to `body`
  ```css
  background-image: url("data:image/svg+xml;utf8,<svg ...><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/>...</svg>");
  ```
- **Radial gradient:** わずかな moss tint を top から (`rgba(47, 82, 51, 0.08)` to transparent)
- 写真の上にテクスチャを重ねない

## Component Patterns

### Button
- Primary: `bg-moss-primary` → hover `bg-moss-light`
- Secondary: `bg-soil-surface` + `border-border`
- Ghost: transparent + `text-moss-light`
- Radius: `md` (8px)
- Padding: `12px 20px`

### Card
- `bg-soil-surface` + `border border-border`
- Radius: `lg` (10-12px)
- Padding: `md` (16px)
- Hover: `translateY(-2px)` + shadow

### ToxicityBadge
- `rounded-full` + `font-bold` + white text
- 記号 + ラベル（`✓ 食用` / `⚠ 毒` 等）
- Compact: 3px 8px padding, 10px font
- Full: 6px 14px padding, 13px font

### Page structure
- Sticky header: `bg-soil-surface` + `border-b border-border` + height 56px
- Body: max-w-lg mx-auto + `pb-20` (nav clearance)
- Bottom nav: 5 tabs, `bg-soil-surface`, lucide icons

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-12 | Initial design system | /design-consultation session with Gemini design research. Dark-first 現代の民藝図鑑 aesthetic chosen over AllTrails-minimal and Seek-playful. |
| 2026-04-12 | 明朝見出し (Noto Serif JP) | Deliberate differentiation from all English-first Japanese apps. Signals "figurative zukan feel" immediately. RISK accepted. |
| 2026-04-12 | 和紙 grain texture | Intentional decoration to support mingei aesthetic. 4% opacity to stay subtle. |
| 2026-04-12 | 5-step safety signal system | Safety-first hierarchy + color+symbol for accessibility. Differentiated from existing apps that treat edibility as "one info among many". |
| 2026-04-12 | Species color visualization | Visual color chips for cap/gill/stem/flesh attributes in detail Bento. Distinctive feature not present in competing apps. |
| 2026-04-12 | CSS-only motion | No Framer Motion. Bundle size + PWA offline priority. |
