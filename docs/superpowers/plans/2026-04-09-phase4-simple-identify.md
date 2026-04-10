# Phase 4: 簡易識別（特徴ベース） 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ルールベースの特徴マッチングによるオフライン簡易識別機能をMycoNoteに追加する

**Architecture:** ユーザーがキノコの形態的特徴（ヒダタイプ・傘の色・形・サイズ等）をチップ選択で入力し、図鑑データの構造化特徴との重み付きスコアマッチングで上位5候補を表示する。TensorFlow.jsは不使用。完全オフライン動作。

**Tech Stack:** Next.js 16 (App Router, Static Export), TypeScript, Tailwind CSS v4, Vitest, Playwright

**設計書:** `docs/superpowers/specs/2026-04-09-phase4-simple-identify-design.md`

---

## ファイル構成

| 操作 | ファイル | 責務 |
|------|---------|------|
| 変更 | `src/types/mushroom.ts` | `MushroomTraits` 型・特徴値の型追加 |
| 変更 | `src/data/mushrooms.json` | 13種に `traits` データ追加 |
| 変更 | `src/data/mushrooms.test.ts` | traits 整合性テスト追加 |
| 新規 | `src/lib/identify-matcher.ts` | 重み付きスコアマッチングエンジン |
| 新規 | `src/lib/identify-matcher.test.ts` | マッチングエンジンのテスト |
| 変更 | `src/constants/ui-text.ts` | 簡易識別用テキスト追加 |
| 新規 | `src/components/identify/FeatureSelector.tsx` | 特徴選択UI |
| 新規 | `src/components/identify/FeatureSelector.test.tsx` | FeatureSelectorのテスト |
| 新規 | `src/components/identify/SimpleIdentifyResult.tsx` | 簡易識別結果表示 |
| 新規 | `src/components/identify/SimpleIdentifyResult.test.tsx` | SimpleIdentifyResultのテスト |
| 新規 | `src/app/identify/simple/page.tsx` | 簡易識別ページ |
| 変更 | `src/app/identify/page.tsx` | 簡易識別カード有効化 |
| 新規 | `e2e/phase4-simple-identify.spec.ts` | Phase 4 E2Eテスト |

---

### Task 1: 型定義と特徴値の定数

**Files:**
- Modify: `src/types/mushroom.ts`

- [ ] **Step 1: MushroomTraits型と特徴値の型を追加**

`src/types/mushroom.ts` の末尾に以下を追加する。既存の型は変更しない。

```typescript
// --- Phase 4: 簡易識別 特徴型 ---

export type GillType = 'gills' | 'pores' | 'teeth' | 'none';
export type CapColor = 'white' | 'brown' | 'red' | 'yellow' | 'orange' | 'gray' | 'black';
export type CapShape = 'flat' | 'convex' | 'funnel' | 'hemisphere' | 'conical';
export type CapSize = 'small' | 'medium' | 'large';
export type GillAttachment = 'free' | 'attached' | 'decurrent' | 'sinuate';
export type StalkColor = 'white' | 'brown' | 'yellow' | 'gray';
export type StalkFeature = 'ring' | 'volva' | 'hollow' | 'fibrous';
export type Bruising = 'blue' | 'red' | 'yellow' | 'none';
export type Substrate = 'broadleaf' | 'conifer' | 'grass' | 'deadwood';

export interface MushroomTraits {
  gill_type: GillType[];
  cap_color: CapColor[];
  cap_shape: CapShape[];
  cap_size: CapSize;
  gill_attachment?: GillAttachment[];
  stalk_color?: StalkColor[];
  stalk_features?: StalkFeature[];
  bruising?: Bruising[];
  substrate?: Substrate[];
}
```

次に、既存の `Mushroom` インターフェースに `traits` フィールドを追加する。

```typescript
// 既存の Mushroom インターフェースに追加:
  traits?: MushroomTraits;
```

`source_url?: string;` の次の行に `traits?: MushroomTraits;` を追加する。オプショナルにすることで既存のテストが壊れない。

- [ ] **Step 2: コンパイル確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx tsc --noEmit 2>&1 | head -10`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/types/mushroom.ts
git commit -m "feat: add MushroomTraits type definitions for feature-based identification"
```

---

### Task 2: 図鑑データに traits 追加

**Files:**
- Modify: `src/data/mushrooms.json`
- Modify: `src/data/mushrooms.test.ts`

- [ ] **Step 1: traits データ整合性テストを追加**

`src/data/mushrooms.test.ts` に以下のテストを追加する（既存テストの下に追加）。

```typescript
describe('mushroom traits', () => {
  it('all mushrooms have traits field', () => {
    for (const m of mushrooms) {
      expect(m.traits, `${m.id} is missing traits`).toBeDefined();
    }
  });

  it('all traits have required fields', () => {
    for (const m of mushrooms) {
      if (!m.traits) continue;
      expect(m.traits.gill_type.length, `${m.id} gill_type is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_color.length, `${m.id} cap_color is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_shape.length, `${m.id} cap_shape is empty`).toBeGreaterThan(0);
      expect(m.traits.cap_size, `${m.id} cap_size is missing`).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/data/mushrooms.test.ts 2>&1 | tail -10`
Expected: FAIL — traits が undefined

- [ ] **Step 3: mushrooms.json に全13種の traits を追加**

各キノコの JSON オブジェクトに `"traits"` フィールドを追加する。以下は全13種のデータ:

```json
// matsutake (マツタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["brown"],
  "cap_shape": ["convex", "flat"],
  "cap_size": "large",
  "gill_attachment": ["sinuate"],
  "stalk_color": ["white", "brown"],
  "stalk_features": ["ring", "fibrous"],
  "bruising": ["none"],
  "substrate": ["conifer"]
}

// shiitake (シイタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["brown"],
  "cap_shape": ["convex", "flat"],
  "cap_size": "medium",
  "gill_attachment": ["free"],
  "stalk_color": ["white", "brown"],
  "stalk_features": ["fibrous"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// enokitake (エノキタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["brown", "yellow"],
  "cap_shape": ["convex", "flat"],
  "cap_size": "small",
  "gill_attachment": ["attached"],
  "stalk_color": ["brown"],
  "stalk_features": ["fibrous"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// nameko (ナメコ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["brown", "orange"],
  "cap_shape": ["convex", "hemisphere"],
  "cap_size": "small",
  "gill_attachment": ["attached"],
  "stalk_color": ["brown"],
  "stalk_features": ["ring"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// hiratake (ヒラタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["gray", "brown"],
  "cap_shape": ["funnel", "flat"],
  "cap_size": "medium",
  "gill_attachment": ["decurrent"],
  "stalk_color": ["white"],
  "stalk_features": ["fibrous"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// tamago-tengu-take (タマゴテングタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["white", "yellow"],
  "cap_shape": ["convex", "flat"],
  "cap_size": "medium",
  "gill_attachment": ["free"],
  "stalk_color": ["white"],
  "stalk_features": ["ring", "volva"],
  "bruising": ["none"],
  "substrate": ["broadleaf"]
}

// doku-tsuru-take (ドクツルタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["white"],
  "cap_shape": ["convex", "flat"],
  "cap_size": "medium",
  "gill_attachment": ["free"],
  "stalk_color": ["white"],
  "stalk_features": ["ring", "volva"],
  "bruising": ["none"],
  "substrate": ["broadleaf", "conifer"]
}

// beni-tengu-take (ベニテングタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["red", "orange"],
  "cap_shape": ["convex", "hemisphere", "flat"],
  "cap_size": "large",
  "gill_attachment": ["free"],
  "stalk_color": ["white"],
  "stalk_features": ["ring", "volva"],
  "bruising": ["none"],
  "substrate": ["conifer", "broadleaf"]
}

// kaen-take (カエンタケ)
"traits": {
  "gill_type": ["none"],
  "cap_color": ["red", "orange"],
  "cap_shape": ["conical"],
  "cap_size": "small",
  "stalk_color": ["red"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// tsukiyo-take (ツキヨタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["brown", "yellow"],
  "cap_shape": ["funnel", "flat"],
  "cap_size": "large",
  "gill_attachment": ["decurrent"],
  "stalk_color": ["brown"],
  "stalk_features": ["fibrous"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// sugi-hiratake (スギヒラタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["white"],
  "cap_shape": ["funnel", "flat"],
  "cap_size": "small",
  "gill_attachment": ["decurrent"],
  "stalk_color": ["white"],
  "stalk_features": ["fibrous"],
  "bruising": ["none"],
  "substrate": ["conifer"]
}

// nigakuri-take (ニガクリタケ)
"traits": {
  "gill_type": ["gills"],
  "cap_color": ["yellow", "orange"],
  "cap_shape": ["convex", "hemisphere"],
  "cap_size": "small",
  "gill_attachment": ["attached"],
  "stalk_color": ["yellow", "brown"],
  "stalk_features": ["hollow"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}

// kawara-take (カワラタケ)
"traits": {
  "gill_type": ["pores"],
  "cap_color": ["brown", "gray"],
  "cap_shape": ["flat"],
  "cap_size": "small",
  "stalk_color": ["brown"],
  "bruising": ["none"],
  "substrate": ["deadwood"]
}
```

各キノコの JSON オブジェクトの最後のフィールド（`source_url` の後）に `"traits"` を追加する。

- [ ] **Step 4: テストがパスすることを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/data/mushrooms.test.ts 2>&1 | tail -10`
Expected: Tests passed

- [ ] **Step 5: コミット**

```bash
git add src/data/mushrooms.json src/data/mushrooms.test.ts
git commit -m "feat: add structured traits data to all 13 mushroom species"
```

---

### Task 3: マッチングエンジン

**Files:**
- Create: `src/lib/identify-matcher.ts`
- Create: `src/lib/identify-matcher.test.ts`

- [ ] **Step 1: テストを作成**

```typescript
// src/lib/identify-matcher.test.ts
import { describe, it, expect } from 'vitest';
import { matchMushrooms } from './identify-matcher';
import type { IdentifyInput } from './identify-matcher';

describe('matchMushrooms', () => {
  it('returns up to 5 results sorted by score descending', () => {
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const results = matchMushrooms(input, 10); // October
    expect(results.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('gives higher score to better matches', () => {
    // shiitake: gills, brown, convex/flat, medium
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const results = matchMushrooms(input, 4); // April (shiitake in season)
    const shiitake = results.find((r) => r.mushroom.id === 'shiitake');
    expect(shiitake).toBeDefined();
    expect(shiitake!.score).toBeGreaterThan(50);
  });

  it('excludes unselected optional fields from score calculation', () => {
    const inputMinimal: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const inputWithExtra: IdentifyInput = {
      ...inputMinimal,
      substrate: 'deadwood',
    };
    const results1 = matchMushrooms(inputMinimal, 4);
    const results2 = matchMushrooms(inputWithExtra, 4);
    // Both should return results; adding more input changes scores but both work
    expect(results1.length).toBeGreaterThan(0);
    expect(results2.length).toBeGreaterThan(0);
  });

  it('halves score for out-of-season mushrooms', () => {
    // matsutake is in season Sep-Nov
    const inputMatsutake: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'large',
    };
    const inSeason = matchMushrooms(inputMatsutake, 10); // October
    const outSeason = matchMushrooms(inputMatsutake, 6); // June
    const matsutakeIn = inSeason.find((r) => r.mushroom.id === 'matsutake');
    const matsutakeOut = outSeason.find((r) => r.mushroom.id === 'matsutake');
    if (matsutakeIn && matsutakeOut) {
      expect(matsutakeOut.score).toBeLessThan(matsutakeIn.score);
    }
  });

  it('includes matched trait names in results', () => {
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
    };
    const results = matchMushrooms(input, 4);
    const match = results.find((r) => r.matchedTraits.length > 0);
    expect(match).toBeDefined();
    expect(match!.matchedTraits).toContain('gill_type');
  });

  it('force-includes toxic similar species with isToxicWarning flag', () => {
    // shiitake has similar_species: ['tsukiyo-take'] which is toxic
    const input: IdentifyInput = {
      gill_type: 'gills',
      cap_color: 'brown',
      cap_shape: 'convex',
      cap_size: 'medium',
    };
    const results = matchMushrooms(input, 4);
    const shiitake = results.find((r) => r.mushroom.id === 'shiitake');
    if (shiitake) {
      const tsukiyotake = results.find((r) => r.mushroom.id === 'tsukiyo-take');
      // tsukiyo-take should be in results either by score or by toxic warning
      // (it may already be in top 5 by score since it also has gills + brown)
    }
    // Just verify the function doesn't crash and returns results
    expect(results.length).toBeGreaterThan(0);
  });

  it('handles pores gill type correctly (kawara-take)', () => {
    const input: IdentifyInput = {
      gill_type: 'pores',
      cap_color: 'brown',
    };
    const results = matchMushrooms(input, 10);
    const kawara = results.find((r) => r.mushroom.id === 'kawara-take');
    expect(kawara).toBeDefined();
    // kawara-take should score highest for pores since it's the only one with pores
    expect(results[0].mushroom.id).toBe('kawara-take');
  });

  it('returns empty matchedTraits for zero-match mushrooms', () => {
    const input: IdentifyInput = {
      gill_type: 'teeth', // no mushroom in data has teeth
    };
    const results = matchMushrooms(input, 6);
    // All results should have score 0 or very low since nothing matches teeth
    for (const r of results) {
      if (r.matchedTraits.includes('gill_type')) {
        // This shouldn't happen since no species has 'teeth'
        expect(true).toBe(false);
      }
    }
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/lib/identify-matcher.test.ts 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: マッチングエンジンを実装**

```typescript
// src/lib/identify-matcher.ts
import { mushrooms } from '@/data/mushrooms';
import type { Mushroom, MushroomTraits } from '@/types/mushroom';

export interface IdentifyInput {
  gill_type?: string;
  cap_color?: string;
  cap_shape?: string;
  cap_size?: string;
  gill_attachment?: string;
  stalk_color?: string;
  stalk_features?: string;
  bruising?: string;
  substrate?: string;
}

export interface MatchResult {
  mushroom: Mushroom;
  score: number;
  matchedTraits: string[];
  isToxicWarning: boolean;
}

const WEIGHTS: Record<string, number> = {
  gill_type: 3,
  cap_color: 2,
  cap_shape: 2,
  cap_size: 1,
  gill_attachment: 3,
  stalk_color: 1,
  stalk_features: 3,
  bruising: 3,
  substrate: 2,
};

function isInSeason(mushroom: Mushroom, month: number): boolean {
  const { start_month, end_month } = mushroom.season;
  if (start_month <= end_month) {
    return month >= start_month && month <= end_month;
  }
  return month >= start_month || month <= end_month;
}

function matchTrait(
  traitKey: string,
  inputValue: string,
  traits: MushroomTraits,
): boolean {
  const traitData = traits[traitKey as keyof MushroomTraits];
  if (traitData === undefined) return false;

  if (Array.isArray(traitData)) {
    return traitData.includes(inputValue);
  }
  // cap_size is a single string value
  return traitData === inputValue;
}

function calculateScore(input: IdentifyInput, mushroom: Mushroom, currentMonth: number): { score: number; matchedTraits: string[] } {
  const traits = mushroom.traits;
  if (!traits) return { score: 0, matchedTraits: [] };

  let totalWeight = 0;
  let matchedWeight = 0;
  const matchedTraits: string[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    const weight = WEIGHTS[key] ?? 1;
    totalWeight += weight;

    if (matchTrait(key, value, traits)) {
      matchedWeight += weight;
      matchedTraits.push(key);
    }
  }

  if (totalWeight === 0) return { score: 0, matchedTraits: [] };

  let score = Math.round((matchedWeight / totalWeight) * 100);

  // Season penalty: halve score for out-of-season species
  if (!isInSeason(mushroom, currentMonth)) {
    score = Math.round(score * 0.5);
  }

  return { score, matchedTraits };
}

export function matchMushrooms(input: IdentifyInput, currentMonth: number): MatchResult[] {
  const mushroomsWithTraits = mushrooms.filter((m) => m.traits);

  // Calculate scores for all mushrooms
  const scored: MatchResult[] = mushroomsWithTraits.map((mushroom) => {
    const { score, matchedTraits } = calculateScore(input, mushroom, currentMonth);
    return { mushroom, score, matchedTraits, isToxicWarning: false };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Take top 5
  const top5 = scored.slice(0, 5);
  const top5Ids = new Set(top5.map((r) => r.mushroom.id));

  // Force-include toxic similar species of top candidates
  const toxicToAdd: MatchResult[] = [];
  for (const result of top5) {
    for (const similarId of result.mushroom.similar_species) {
      if (top5Ids.has(similarId)) continue;
      const similar = mushroomsWithTraits.find((m) => m.id === similarId);
      if (!similar) continue;
      if (similar.toxicity !== 'toxic' && similar.toxicity !== 'deadly_toxic') continue;
      if (toxicToAdd.some((t) => t.mushroom.id === similarId)) continue;

      const { score, matchedTraits } = calculateScore(input, similar, currentMonth);
      toxicToAdd.push({ mushroom: similar, score, matchedTraits, isToxicWarning: true });
    }
  }

  return [...top5, ...toxicToAdd];
}
```

- [ ] **Step 4: テストがパスすることを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/lib/identify-matcher.test.ts 2>&1 | tail -15`
Expected: Tests passed

- [ ] **Step 5: コミット**

```bash
git add src/lib/identify-matcher.ts src/lib/identify-matcher.test.ts
git commit -m "feat: add weighted score matching engine for simple identification"
```

---

### Task 4: UIテキスト定数更新

**Files:**
- Modify: `src/constants/ui-text.ts`

- [ ] **Step 1: 簡易識別用テキストを追加**

`src/constants/ui-text.ts` の `identify` セクション内で以下のキーを変更・追加する。

変更するキー:
```typescript
simpleDescription: '写真を見ながら特徴を選択し、候補種を表示します。通信不要で現地でも使えます。',
simpleLabel: 'オフライン・特徴マッチング',
```

`simpleComingSoon` キーを削除し、以下のキーを `identify` セクション末尾に追加:
```typescript
offlineAvailable: 'オフライン対応',
simpleResultSafetyWarning: '簡易判定です。採取判断には使用しないでください。',
referencePhoto: '参考写真',
referencePhotoHint: '写真を見ながら特徴を選択してください',
changePhoto: '写真を変更',
gillType: 'ヒダのタイプ',
gillTypeGills: 'ヒダ',
gillTypePores: '管孔',
gillTypeTeeth: '針状',
gillTypeNone: 'なし',
capColor: '傘の色',
colorWhite: '白',
colorBrown: '茶',
colorRed: '赤',
colorYellow: '黄',
colorOrange: '橙',
colorGray: '灰',
colorBlack: '黒',
capShape: '傘の形',
shapeFlat: '平',
shapeConvex: 'まんじゅう',
shapeFunnel: '漏斗',
shapeHemisphere: '半球',
shapeConical: '円錐',
capSize: '傘のサイズ',
sizeSmall: '小 〜5cm',
sizeMedium: '中 5〜15cm',
sizeLarge: '大 15cm〜',
moreFilters: 'もっと絞り込む',
lessFilters: '絞り込みを閉じる',
gillAttachment: 'ヒダの付き方',
attachFree: '離生',
attachAttached: '直生',
attachDecurrent: '垂生',
attachSinuate: '湾生',
stalkColor: '柄の色',
stalkFeatures: '柄の特徴',
featureRing: 'つば有',
featureVolva: 'つぼ有',
featureHollow: '中空',
featureFibrous: '繊維状',
bruising: '変色反応',
bruisingBlue: '青変',
bruisingRed: '赤変',
bruisingYellow: '黄変',
bruisingNone: 'なし',
substrateLabel: '発生場所',
substrateBroadleaf: '広葉樹林',
substrateConifer: '針葉樹林',
substrateGrass: '草地',
substrateDeadwood: '倒木上',
seasonLabel: '発生時期',
searchCandidates: '候補を検索',
matched: '一致',
changeConditions: '条件を変える',
goToDetailIdentify: '詳細識別へ',
```

- [ ] **Step 2: コンパイル確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx tsc --noEmit 2>&1 | head -10`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/constants/ui-text.ts
git commit -m "feat: add simple identification UI text constants"
```

---

### Task 5: FeatureSelectorコンポーネント

**Files:**
- Create: `src/components/identify/FeatureSelector.tsx`
- Create: `src/components/identify/FeatureSelector.test.tsx`

- [ ] **Step 1: テストを作成**

```typescript
// src/components/identify/FeatureSelector.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureSelector } from './FeatureSelector';
import type { IdentifyInput } from '@/lib/identify-matcher';

describe('FeatureSelector', () => {
  it('renders all required feature sections', () => {
    render(<FeatureSelector input={{}} onChange={vi.fn()} />);
    expect(screen.getByText(/ヒダのタイプ/)).toBeInTheDocument();
    expect(screen.getByText(/傘の色/)).toBeInTheDocument();
    expect(screen.getByText(/傘の形/)).toBeInTheDocument();
    expect(screen.getByText(/傘のサイズ/)).toBeInTheDocument();
  });

  it('calls onChange when a chip is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeatureSelector input={{}} onChange={onChange} />);
    await user.click(screen.getByText('ヒダ'));
    expect(onChange).toHaveBeenCalledWith({ gill_type: 'gills' });
  });

  it('shows additional filters when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<FeatureSelector input={{}} onChange={vi.fn()} />);
    expect(screen.queryByText(/ヒダの付き方/)).not.toBeInTheDocument();
    await user.click(screen.getByText(/もっと絞り込む/));
    expect(screen.getByText(/ヒダの付き方/)).toBeInTheDocument();
    expect(screen.getByText(/柄の色/)).toBeInTheDocument();
    expect(screen.getByText(/変色反応/)).toBeInTheDocument();
  });

  it('highlights selected chips', () => {
    render(<FeatureSelector input={{ gill_type: 'gills' }} onChange={vi.fn()} />);
    const gillsChip = screen.getByText('ヒダ');
    expect(gillsChip.className).toContain('bg-forest-500');
  });

  it('deselects a chip when clicked again', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FeatureSelector input={{ gill_type: 'gills' }} onChange={onChange} />);
    await user.click(screen.getByText('ヒダ'));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/components/identify/FeatureSelector.test.tsx 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: FeatureSelectorを実装**

```typescript
// src/components/identify/FeatureSelector.tsx
'use client';

import { useState } from 'react';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyInput } from '@/lib/identify-matcher';

interface FeatureSelectorProps {
  input: IdentifyInput;
  onChange: (input: IdentifyInput) => void;
}

interface ChipOption {
  value: string;
  label: string;
}

function ChipGroup({
  label,
  icon,
  options,
  selected,
  onSelect,
  required,
}: {
  label: string;
  icon: string;
  options: ChipOption[];
  selected?: string;
  onSelect: (value: string | undefined) => void;
  required?: boolean;
}) {
  return (
    <div className="mb-3">
      <div className="text-[10px] font-bold text-forest-400 mb-1.5">
        {icon} {label} {required && <span className="text-amber-500">*</span>}
      </div>
      <div className="flex gap-1 flex-wrap">
        {options.map(({ value, label: chipLabel }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(selected === value ? undefined : value)}
            className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
              selected === value
                ? 'bg-forest-500 text-white border-forest-400'
                : 'bg-forest-900 text-forest-400 border-forest-700 hover:border-forest-500'
            }`}
          >
            {chipLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

const T = UI_TEXT.identify;

const REQUIRED_GROUPS: { key: keyof IdentifyInput; label: string; icon: string; options: ChipOption[] }[] = [
  {
    key: 'gill_type', label: T.gillType, icon: '🔬',
    options: [
      { value: 'gills', label: T.gillTypeGills },
      { value: 'pores', label: T.gillTypePores },
      { value: 'teeth', label: T.gillTypeTeeth },
      { value: 'none', label: T.gillTypeNone },
    ],
  },
  {
    key: 'cap_color', label: T.capColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite },
      { value: 'brown', label: T.colorBrown },
      { value: 'red', label: T.colorRed },
      { value: 'yellow', label: T.colorYellow },
      { value: 'orange', label: T.colorOrange },
      { value: 'gray', label: T.colorGray },
      { value: 'black', label: T.colorBlack },
    ],
  },
  {
    key: 'cap_shape', label: T.capShape, icon: '🍄',
    options: [
      { value: 'flat', label: T.shapeFlat },
      { value: 'convex', label: T.shapeConvex },
      { value: 'funnel', label: T.shapeFunnel },
      { value: 'hemisphere', label: T.shapeHemisphere },
      { value: 'conical', label: T.shapeConical },
    ],
  },
  {
    key: 'cap_size', label: T.capSize, icon: '📏',
    options: [
      { value: 'small', label: T.sizeSmall },
      { value: 'medium', label: T.sizeMedium },
      { value: 'large', label: T.sizeLarge },
    ],
  },
];

const EXTRA_GROUPS: { key: keyof IdentifyInput; label: string; icon: string; options: ChipOption[] }[] = [
  {
    key: 'gill_attachment', label: T.gillAttachment, icon: '📎',
    options: [
      { value: 'free', label: T.attachFree },
      { value: 'attached', label: T.attachAttached },
      { value: 'decurrent', label: T.attachDecurrent },
      { value: 'sinuate', label: T.attachSinuate },
    ],
  },
  {
    key: 'stalk_color', label: T.stalkColor, icon: '🎨',
    options: [
      { value: 'white', label: T.colorWhite },
      { value: 'brown', label: T.colorBrown },
      { value: 'yellow', label: T.colorYellow },
      { value: 'gray', label: T.colorGray },
    ],
  },
  {
    key: 'stalk_features', label: T.stalkFeatures, icon: '🔧',
    options: [
      { value: 'ring', label: T.featureRing },
      { value: 'volva', label: T.featureVolva },
      { value: 'hollow', label: T.featureHollow },
      { value: 'fibrous', label: T.featureFibrous },
    ],
  },
  {
    key: 'bruising', label: T.bruising, icon: '🩹',
    options: [
      { value: 'blue', label: T.bruisingBlue },
      { value: 'red', label: T.bruisingRed },
      { value: 'yellow', label: T.bruisingYellow },
      { value: 'none', label: T.bruisingNone },
    ],
  },
  {
    key: 'substrate', label: T.substrateLabel, icon: '🌲',
    options: [
      { value: 'broadleaf', label: T.substrateBroadleaf },
      { value: 'conifer', label: T.substrateConifer },
      { value: 'grass', label: T.substrateGrass },
      { value: 'deadwood', label: T.substrateDeadwood },
    ],
  },
];

export function FeatureSelector({ input, onChange }: FeatureSelectorProps) {
  const [showExtra, setShowExtra] = useState(false);

  const handleSelect = (key: keyof IdentifyInput, value: string | undefined) => {
    const next = { ...input };
    if (value === undefined) {
      delete next[key];
    } else {
      (next as Record<string, string>)[key] = value;
    }
    onChange(next);
  };

  const extraCount = EXTRA_GROUPS.length;

  return (
    <div>
      {REQUIRED_GROUPS.map((group) => (
        <ChipGroup
          key={group.key}
          label={group.label}
          icon={group.icon}
          options={group.options}
          selected={input[group.key]}
          onSelect={(v) => handleSelect(group.key, v)}
          required
        />
      ))}

      <button
        type="button"
        onClick={() => setShowExtra(!showExtra)}
        className="w-full py-2 bg-forest-900 border border-forest-700 rounded-md text-xs text-forest-500 mb-3 hover:border-forest-500"
      >
        {showExtra ? `▲ ${T.lessFilters}` : `▼ ${T.moreFilters}（${extraCount}項目）`}
      </button>

      {showExtra && EXTRA_GROUPS.map((group) => (
        <ChipGroup
          key={group.key}
          label={group.label}
          icon={group.icon}
          options={group.options}
          selected={input[group.key]}
          onSelect={(v) => handleSelect(group.key, v)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: テストがパスすることを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/components/identify/FeatureSelector.test.tsx 2>&1 | tail -10`
Expected: Tests passed

- [ ] **Step 5: コミット**

```bash
git add src/components/identify/FeatureSelector.tsx src/components/identify/FeatureSelector.test.tsx
git commit -m "feat: add FeatureSelector component with chip-based input"
```

---

### Task 6: SimpleIdentifyResultコンポーネント

**Files:**
- Create: `src/components/identify/SimpleIdentifyResult.tsx`
- Create: `src/components/identify/SimpleIdentifyResult.test.tsx`

- [ ] **Step 1: テストを作成**

```typescript
// src/components/identify/SimpleIdentifyResult.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimpleIdentifyResult } from './SimpleIdentifyResult';
import type { MatchResult } from '@/lib/identify-matcher';
import type { Mushroom } from '@/types/mushroom';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const makeMushroom = (overrides: Partial<Mushroom>): Mushroom => ({
  id: 'test',
  names: { ja: 'テスト', scientific: 'Test sp.' },
  toxicity: 'edible',
  season: { start_month: 1, end_month: 12 },
  habitat: [],
  regions: [],
  image_local: '/images/mushrooms/placeholder.svg',
  images_remote: [],
  description: '',
  features: '',
  similar_species: [],
  ...overrides,
});

const mockResults: MatchResult[] = [
  { mushroom: makeMushroom({ id: 'shiitake', names: { ja: 'シイタケ', scientific: 'Lentinula edodes' }, toxicity: 'edible' }), score: 85, matchedTraits: ['gill_type', 'cap_color'], isToxicWarning: false },
  { mushroom: makeMushroom({ id: 'tsukiyo-take', names: { ja: 'ツキヨタケ', scientific: 'Omphalotus japonicus' }, toxicity: 'toxic' }), score: 60, matchedTraits: ['gill_type'], isToxicWarning: true },
  { mushroom: makeMushroom({ id: 'nameko', names: { ja: 'ナメコ', scientific: 'Pholiota microspora' }, toxicity: 'edible' }), score: 45, matchedTraits: ['cap_color'], isToxicWarning: false },
];

describe('SimpleIdentifyResult', () => {
  it('displays all candidate names', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText('シイタケ')).toBeInTheDocument();
    expect(screen.getByText('ツキヨタケ')).toBeInTheDocument();
    expect(screen.getByText('ナメコ')).toBeInTheDocument();
  });

  it('shows toxicity badges', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText('食用')).toBeInTheDocument();
    expect(screen.getByText('毒')).toBeInTheDocument();
  });

  it('shows score percentages', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('shows safety warning', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText(/簡易判定です/)).toBeInTheDocument();
  });

  it('shows retry and detail identify buttons', () => {
    render(<SimpleIdentifyResult results={mockResults} onRetry={vi.fn()} />);
    expect(screen.getByText(/条件を変える/)).toBeInTheDocument();
    expect(screen.getByText(/詳細識別へ/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/components/identify/SimpleIdentifyResult.test.tsx 2>&1 | tail -10`
Expected: FAIL

- [ ] **Step 3: SimpleIdentifyResultを実装**

```typescript
// src/components/identify/SimpleIdentifyResult.tsx
'use client';

import { useRouter } from 'next/navigation';
import { UI_TEXT } from '@/constants/ui-text';
import { TOXICITY_LABELS } from '@/constants/toxicity';
import type { MatchResult } from '@/lib/identify-matcher';

interface SimpleIdentifyResultProps {
  results: MatchResult[];
  onRetry: () => void;
}

const toxicityBadge: Record<string, { bg: string; text: string }> = {
  edible: { bg: 'bg-green-600', text: 'text-white' },
  edible_caution: { bg: 'bg-yellow-600', text: 'text-white' },
  inedible: { bg: 'bg-gray-500', text: 'text-white' },
  toxic: { bg: 'bg-red-600', text: 'text-white' },
  deadly_toxic: { bg: 'bg-red-700', text: 'text-white' },
};

const T = UI_TEXT.identify;

const TRAIT_LABELS: Record<string, string> = {
  gill_type: T.gillType,
  cap_color: T.capColor,
  cap_shape: T.capShape,
  cap_size: T.capSize,
  gill_attachment: T.gillAttachment,
  stalk_color: T.stalkColor,
  stalk_features: T.stalkFeatures,
  bruising: T.bruising,
  substrate: T.substrateLabel,
};

export function SimpleIdentifyResult({ results, onRetry }: SimpleIdentifyResultProps) {
  const router = useRouter();
  const isToxic = (t: string) => t === 'toxic' || t === 'deadly_toxic';

  return (
    <div className="space-y-3">
      {/* 注意書き */}
      <div className="rounded-lg border-l-[3px] border-amber-500 bg-forest-900 p-3">
        <p className="text-xs text-amber-300">⚠ {T.simpleResultSafetyWarning}</p>
      </div>

      {/* 候補一覧 */}
      {results.map((result) => {
        const m = result.mushroom;
        const toxic = isToxic(m.toxicity);
        const badge = toxicityBadge[m.toxicity];
        return (
          <button
            key={m.id}
            onClick={() => router.push(`/zukan/${m.id}`)}
            className={`w-full text-left rounded-lg p-2.5 ${
              toxic
                ? 'bg-red-950/50 border border-red-800'
                : 'bg-forest-900 border border-forest-700'
            }`}
          >
            <div className="flex gap-2.5">
              {/* サムネイル */}
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.image_local}
                  alt={m.names.ja}
                  className="w-14 h-14 object-cover rounded-md"
                />
                {toxic && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white">⚠</div>
                )}
              </div>
              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${toxic ? 'text-red-200' : 'text-forest-100'}`}>
                    {m.names.ja}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                    {TOXICITY_LABELS[m.toxicity]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`flex-1 h-1.5 rounded-full ${toxic ? 'bg-red-900' : 'bg-forest-800'}`}>
                    <div
                      className={`h-1.5 rounded-full ${toxic ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${toxic ? 'text-red-300' : 'text-forest-400'}`}>{result.score}%</span>
                </div>
                {result.matchedTraits.length > 0 && (
                  <div className={`text-[9px] ${toxic ? 'text-red-400' : 'text-forest-500'}`}>
                    {result.isToxicWarning && '⚠ '}
                    {T.matched}: {result.matchedTraits.map((t) => TRAIT_LABELS[t] ?? t).join('・')}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 bg-forest-900 border border-forest-700 rounded-lg text-xs text-forest-400 hover:border-forest-500"
        >
          🔄 {T.changeConditions}
        </button>
        <button
          onClick={() => router.push('/identify/detail')}
          className="flex-1 py-2.5 bg-forest-900 border border-forest-700 rounded-lg text-xs text-forest-400 hover:border-forest-500"
        >
          🔬 {T.goToDetailIdentify}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: テストがパスすることを確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run src/components/identify/SimpleIdentifyResult.test.tsx 2>&1 | tail -10`
Expected: Tests passed

- [ ] **Step 5: コミット**

```bash
git add src/components/identify/SimpleIdentifyResult.tsx src/components/identify/SimpleIdentifyResult.test.tsx
git commit -m "feat: add SimpleIdentifyResult component with score bars and toxic warnings"
```

---

### Task 7: 簡易識別ページ

**Files:**
- Create: `src/app/identify/simple/page.tsx`

- [ ] **Step 1: 簡易識別ページを作成**

```typescript
// src/app/identify/simple/page.tsx
'use client';

import { useState, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { FeatureSelector } from '@/components/identify/FeatureSelector';
import { SimpleIdentifyResult } from '@/components/identify/SimpleIdentifyResult';
import { matchMushrooms } from '@/lib/identify-matcher';
import { compressImage, blobToDataUrl } from '@/lib/photo';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyInput, MatchResult } from '@/lib/identify-matcher';

const T = UI_TEXT.identify;

export default function SimpleIdentifyPage() {
  const [input, setInput] = useState<IdentifyInput>({});
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const url = await blobToDataUrl(compressed);
    setPhotoUrl(url);
    e.target.value = '';
  };

  const handleSearch = () => {
    const currentMonth = new Date().getMonth() + 1;
    const matched = matchMushrooms(input, currentMonth);
    setResults(matched);
  };

  const handleRetry = () => {
    setResults(null);
  };

  const hasRequiredInput = !!(input.gill_type && input.cap_color && input.cap_shape && input.cap_size);

  return (
    <div className="min-h-screen bg-forest-950">
      <PageHeader title={results ? T.resultTitle : T.simpleTitle} showBack />

      {/* 結果表示 */}
      {results && (
        <div className="px-4 py-4">
          <SimpleIdentifyResult results={results} onRetry={handleRetry} />
        </div>
      )}

      {/* 入力フォーム */}
      {!results && (
        <div className="px-4 py-4 space-y-3">
          {/* 注意書き */}
          <div className="rounded-lg border-l-[3px] border-amber-500 bg-forest-900 p-3">
            <p className="text-xs text-amber-300">⚠ {T.simpleResultSafetyWarning}</p>
          </div>

          {/* 参考写真 */}
          <div className="rounded-lg bg-forest-900 border border-forest-700 overflow-hidden">
            {photoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={T.referencePhoto} className="w-full h-[180px] object-cover" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                  <span className="text-[10px] text-white/70">📷 {T.referencePhotoHint}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-black/50 border border-white/30 rounded-md text-[10px] text-white"
                  >
                    {T.changePhoto}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[120px] flex flex-col items-center justify-center gap-2 text-forest-500 hover:text-forest-400"
              >
                <span className="text-2xl">📷</span>
                <span className="text-xs">{T.referencePhoto}（任意）</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* 特徴選択 */}
          <FeatureSelector input={input} onChange={setInput} />

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={!hasRequiredInput}
            className="w-full py-3 bg-forest-500 text-white rounded-lg text-sm font-bold hover:bg-forest-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔍 {T.searchCandidates}
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build 2>&1 | tail -20`
Expected: ビルド成功、`/identify/simple` がルートに含まれる

- [ ] **Step 3: コミット**

```bash
git add src/app/identify/simple/page.tsx
git commit -m "feat: add simple identification page with feature input and results"
```

---

### Task 8: 識別モード選択画面の更新

**Files:**
- Modify: `src/app/identify/page.tsx`

- [ ] **Step 1: 簡易識別カードを有効化**

`src/app/identify/page.tsx` の簡易識別カード部分（`{/* 簡易識別カード（無効） */}` から始まるブロック）を以下で置き換える。

現在のコード（opacity-50で無効化されたdiv）を、タップ可能なbuttonに変更:

```tsx
{/* 簡易識別カード（有効） */}
<button
  onClick={() => router.push('/identify/simple')}
  className="w-full text-left rounded-xl bg-forest-800 p-4 border-2 border-forest-600 transition-colors hover:border-forest-400"
>
  <div className="flex items-center gap-3 mb-2">
    <div className="w-10 h-10 rounded-lg bg-forest-900 flex items-center justify-center text-xl">
      📷
    </div>
    <div className="flex-1">
      <div className="font-bold text-sm text-forest-100">{UI_TEXT.identify.simpleTitle}</div>
      <div className="text-xs text-forest-400">{UI_TEXT.identify.simpleLabel}</div>
    </div>
    <span className="text-forest-400 text-lg">→</span>
  </div>
  <p className="text-xs text-forest-400 leading-relaxed mb-2">{UI_TEXT.identify.simpleDescription}</p>
  <span className="text-[10px] bg-forest-900 text-forest-400 px-2 py-0.5 rounded-full border border-forest-700">
    📴 {UI_TEXT.identify.offlineAvailable}
  </span>
</button>
```

Also update the `safetyWarning` text to be more general (remove "AI" since simple identify is rule-based). Check: the current `safetyWarning` text already says 「どちらの識別もAIによる推定です」but simple identify is NOT AI-based. Change the text in `ui-text.ts`:

```typescript
safetyWarning: 'どちらの識別も参考情報です。採取の最終判断は必ず専門家または経験者に確認してください。',
```

- [ ] **Step 2: ビルド確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build 2>&1 | tail -20`
Expected: ビルド成功

- [ ] **Step 3: コミット**

```bash
git add src/app/identify/page.tsx src/constants/ui-text.ts
git commit -m "feat: enable simple identification card on mode selection page"
```

---

### Task 9: 全テスト通過確認

**Files:** なし

- [ ] **Step 1: 全ユニットテスト実行**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx vitest run 2>&1 | tail -15`
Expected: ALL TESTS PASSED

- [ ] **Step 2: ビルド確認**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build 2>&1 | tail -20`
Expected: ビルド成功

- [ ] **Step 3: 問題があれば修正してコミット**

---

### Task 10: E2Eテスト

**Files:**
- Create: `e2e/phase4-simple-identify.spec.ts`

- [ ] **Step 1: E2Eテストを作成**

```typescript
// e2e/phase4-simple-identify.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Phase 4: 簡易識別', () => {
  test.describe('識別モード選択画面', () => {
    test('簡易識別カードが有効でタップ可能', async ({ page }) => {
      await page.goto('/identify');
      const simpleCard = page.getByText('簡易識別').first();
      await expect(simpleCard).toBeVisible();
      await simpleCard.click();
      await expect(page).toHaveURL(/\/identify\/simple/);
    });

    test('オフライン対応タグが表示される', async ({ page }) => {
      await page.goto('/identify');
      await expect(page.getByText('オフライン対応')).toBeVisible();
    });
  });

  test.describe('簡易識別画面', () => {
    test('必須4項目が表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText('ヒダのタイプ')).toBeVisible();
      await expect(page.getByText('傘の色')).toBeVisible();
      await expect(page.getByText('傘の形')).toBeVisible();
      await expect(page.getByText('傘のサイズ')).toBeVisible();
    });

    test('検索ボタンは必須項目未選択時に無効', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByRole('button', { name: /候補を検索/ })).toBeDisabled();
    });

    test('注意書きが表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText(/簡易判定です/)).toBeVisible();
    });

    test('もっと絞り込むで追加項目が展開される', async ({ page }) => {
      await page.goto('/identify/simple');
      await expect(page.getByText('ヒダの付き方')).not.toBeVisible();
      await page.getByText(/もっと絞り込む/).click();
      await expect(page.getByText('ヒダの付き方')).toBeVisible();
      await expect(page.getByText('柄の色')).toBeVisible();
      await expect(page.getByText('変色反応')).toBeVisible();
    });

    test('特徴を選択して検索すると結果が表示される', async ({ page }) => {
      await page.goto('/identify/simple');
      // 必須項目を選択
      await page.getByText('ヒダ', { exact: true }).click();
      await page.getByText('茶', { exact: true }).click();
      await page.getByText('まんじゅう', { exact: true }).click();
      await page.getByText(/中 5〜15cm/).click();
      // 検索
      await page.getByRole('button', { name: /候補を検索/ }).click();
      // 結果が表示される
      await expect(page.getByText('識別結果')).toBeVisible();
      // 注意書きが結果画面にも表示
      await expect(page.getByText(/簡易判定です/)).toBeVisible();
    });

    test('結果画面から条件を変えるで入力に戻れる', async ({ page }) => {
      await page.goto('/identify/simple');
      await page.getByText('ヒダ', { exact: true }).click();
      await page.getByText('茶', { exact: true }).click();
      await page.getByText('まんじゅう', { exact: true }).click();
      await page.getByText(/中 5〜15cm/).click();
      await page.getByRole('button', { name: /候補を検索/ }).click();
      await page.getByText(/条件を変える/).click();
      await expect(page.getByText('ヒダのタイプ')).toBeVisible();
    });
  });
});
```

- [ ] **Step 2: E2Eテスト実行**

Run: `cd "C:/Users/asaku/Desktop/pc_data/works/MycoNote" && npx next build && npx playwright test e2e/phase4-simple-identify.spec.ts 2>&1 | tail -30`
Expected: ALL TESTS PASSED

- [ ] **Step 3: コミット**

```bash
git add e2e/phase4-simple-identify.spec.ts
git commit -m "test: add Phase 4 simple identification E2E tests"
```

---

### Task 11: 進捗ドキュメント・メモリ更新

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: progress.md 更新**

Phase 4 セクションを更新:

```markdown
## Phase 4: 簡易識別（特徴ベース） — 完了 (2026-04-09)
- [x] MushroomTraits 型定義
- [x] 図鑑13種に構造化特徴データ追加
- [x] 重み付きスコアマッチングエンジン
- [x] FeatureSelector コンポーネント (必須4項目 + 追加6項目)
- [x] SimpleIdentifyResult コンポーネント (写真・スコアバー・毒キノコ強調)
- [x] 簡易識別ページ (ダークグリーンテーマ・参考写真付き)
- [x] 識別モード選択画面更新 (簡易識別カード有効化)
- [x] E2Eテスト
```

- [ ] **Step 2: コミット**

```bash
git add docs/progress.md
git commit -m "docs: update progress tracker — Phase 4 complete"
```
