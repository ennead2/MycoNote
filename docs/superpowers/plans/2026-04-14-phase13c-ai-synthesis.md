# Phase 13-C: AI 合成パイプライン Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Phase 13-A/B で収集した combined source JSON と tier0 種リストから、Claude Opus 4.6 の subagent で v2 スキーマ準拠の記事 JSON を合成するパイプラインを構築し、Tier 0 68 種の初回合成を完走させる。

**Architecture:** Phase 13-A/B と同じ「1 責務 = 1 `.mjs` モジュール + fixture 駆動 unit test」パターン。プロンプト組立 / 類似種解決 / 機械検証 / オーケストレーション を純関数に分離。AI 合成本体は Claude Code の `Agent` ツール（`model: opus`）で subagent 並列発射。Node 側は非 AI 部分のみ担当。

**Tech Stack:** Node.js 20+, ES Modules, vitest, native fetch、Phase 13-A/B の fixture パターン再利用。新規依存なし。

**Spec:** `docs/superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md`

---

## Task 1: 出力ディレクトリと gitignore を整備する

**Files:**
- Modify: `.gitignore`
- Create (empty commit-friendly): `generated/articles/.gitkeep`

- [ ] **Step 1: .gitignore に `.cache/phase13/generated/` を追記**

`.cache/phase13/` は既に gitignore 済だが、明示的に generated サブディレクトリも対象であることを確認。既存ルール `/.cache/` で包括されていればこのステップは skip。

Run: `grep -nE "^\.cache|^/.cache" .gitignore`

期待: 1 行以上ヒット。なければ以下を追加:
```
.cache/
```

- [ ] **Step 2: `generated/articles/` ディレクトリを commit 対象として作成**

```bash
mkdir -p generated/articles
touch generated/articles/.gitkeep
```

- [ ] **Step 3: コミット**

```bash
git add .gitignore generated/articles/.gitkeep
git commit -m "chore(phase13c): generated/articles/ ディレクトリを追加"
```

---

## Task 2: プロンプト組立モジュール `prompt_templates.mjs`

**Files:**
- Create: `scripts/phase13/prompt_templates.mjs`
- Create: `scripts/phase13/prompt_templates.test.mjs`
- Create: `scripts/phase13/fixtures/prompt-input-morchella.json`

**責務:** 種の基本情報（和名・学名・safety）と combined JSON のパスを受け取り、subagent に渡すプロンプト文字列を生成する。プロンプト本体は純文字列、fixture 駆動でテストする。

- [ ] **Step 1: fixture を作成**

`scripts/phase13/fixtures/prompt-input-morchella.json`:

```json
{
  "japaneseName": "アミガサタケ",
  "scientificName": "Morchella esculenta",
  "safety": "edible",
  "combinedJsonPath": ".cache/phase13/combined/Morchella_esculenta.json",
  "outputJsonPath": ".cache/phase13/generated/Morchella_esculenta.json"
}
```

- [ ] **Step 2: 失敗テストを書く**

`scripts/phase13/prompt_templates.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildArticlePrompt, SCHEMA_BLOCK, RULES_BLOCK } from './prompt_templates.mjs';

const fixture = JSON.parse(readFileSync('scripts/phase13/fixtures/prompt-input-morchella.json', 'utf8'));

describe('buildArticlePrompt', () => {
  it('必要セクションが含まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('# 対象種');
    expect(prompt).toContain('# 一次ソース');
    expect(prompt).toContain('# 絶対遵守ルール');
    expect(prompt).toContain('# 出力 JSON スキーマ');
    expect(prompt).toContain('# season 仕様');
    expect(prompt).toContain('# 完了後');
  });

  it('japaneseName / scientificName / safety が埋め込まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('アミガサタケ');
    expect(prompt).toContain('Morchella esculenta');
    expect(prompt).toContain('edible');
  });

  it('combinedJsonPath と outputJsonPath が埋め込まれる', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toContain('.cache/phase13/combined/Morchella_esculenta.json');
    expect(prompt).toContain('.cache/phase13/generated/Morchella_esculenta.json');
  });

  it('safety=edible では poisoning_first_aid の指示が null 化されている', () => {
    const prompt = buildArticlePrompt(fixture);
    expect(prompt).toMatch(/poisoning_first_aid.*null/);
  });

  it('safety=deadly では cooking_preservation の指示が null 化されている', () => {
    const prompt = buildArticlePrompt({ ...fixture, safety: 'deadly' });
    expect(prompt).toMatch(/cooking_preservation.*null/);
  });

  it('SCHEMA_BLOCK に必須フィールドが全て含まれる', () => {
    const required = [
      'names', 'aliases', 'season', 'habitat', 'regions',
      'tree_association', 'similar_species',
      'description', 'features', 'cooking_preservation',
      'poisoning_first_aid', 'caution', 'sources', 'notes',
    ];
    for (const f of required) {
      expect(SCHEMA_BLOCK).toContain(f);
    }
  });

  it('RULES_BLOCK に 8 条のルールが含まれる', () => {
    for (let i = 1; i <= 8; i++) {
      expect(RULES_BLOCK).toMatch(new RegExp(`^${i}\\.`, 'm'));
    }
  });
});
```

- [ ] **Step 3: テストを実行して失敗を確認**

Run: `npx vitest run scripts/phase13/prompt_templates.test.mjs`
Expected: FAIL — "Cannot find module './prompt_templates.mjs'"

- [ ] **Step 4: `prompt_templates.mjs` を実装**

```javascript
/**
 * Phase 13-C subagent に渡すプロンプト文字列を組み立てる。
 */

export const RULES_BLOCK = `1. ソースに明示的に書かれていない事実は絶対に書かない。推測・一般化・比喩による補填を禁止
2. ソース間で矛盾する場合は信頼性の高い記述を採用し、選定理由を notes に記す
3. 日本国内の情報を優先する。海外情報は国内事情の補足のみ（regions は海外含む可）
4. 自由文フィールドは散文のみ。箇条書き・番号リスト・表を禁止
5. 各自由文フィールドの文字数上限を厳守（超過時は削って収める）
6. 自由文に学名・分類階層（門綱目科属）を書かない
7. 自由文では段落末尾に [1][2] 形式で出典番号を付与
8. 数値は資料の値をそのまま引用`;

export const SCHEMA_BLOCK = `{
  "names": { "aliases": ["別名・旧和名・漢字表記・方言名・外来カタカナ等"] },
  "season": [
    { "start_month": 1-12, "end_month": 1-12 }
  ],
  "habitat": ["発生環境タグ 1〜5 個"],
  "regions": ["分布地域（海外含む可）"],
  "tree_association": ["関連樹種"],
  "similar_species": [
    { "ja": "和名", "note": "本種との識別ポイント ≤50 字" }
  ],
  "description": "≤ 400 字 概要散文 [1]",
  "features": "≤ 400 字 形態 + 発生生態の散文 [1]",
  "cooking_preservation": "≤ 400 字 和食優先、edible/caution のみ、それ以外 null",
  "poisoning_first_aid": "≤ 400 字 caution/toxic/deadly のみ、edible なら null",
  "caution": "≤ 100 字 危険種のみ、edible なら null",
  "sources": [
    { "name": "Wikipedia ja「xxx」", "url": "...", "license": "CC BY-SA 4.0" }
  ],
  "notes": "編集判断ログ 50〜200字"
}`;

export const FIELD_GUIDE = `- description: 何者か・特徴・食用性・国内の位置づけ。学名・分類階層は書かない
- features: 肉眼的特徴 + 発生季節・場所・共生樹種を散文で融合
- cooking_preservation: 和食文脈優先。海外レシピは国内料理の補足としてのみ
- poisoning_first_aid: 症状・潜伏時間・主な毒成分・応急措置の順
- caution: 致命的・特筆すべき警告一文のみ
- similar_species[].note: 本種との識別点を 50 字以内
- season: 「春〜初夏」等の曖昧表現は月数値に翻訳し notes に記載
- 日本国内の情報が乏しいフィールドは [] / null / 空文字のいずれか妥当な値、notes に明記`;

export const SEASON_SPEC = `- 配列で発生期ごとに {start_month, end_month} を 1 要素
- 春秋 2 期型（シイタケ等）は必ず 2 要素で表現
- 単一期は 1 要素
- 月数値は 1〜12 の整数、start <= end`;

function safetyHints(safety) {
  const edible = safety === 'edible' || safety === 'caution';
  const dangerous = safety === 'caution' || safety === 'toxic' || safety === 'deadly';
  const hasCaution = safety === 'caution' || safety === 'toxic' || safety === 'deadly';
  return {
    cooking: edible ? '必須（400字以内）' : 'null を返す',
    poisoning: dangerous ? '必須（400字以内）' : 'null を返す',
    caution: hasCaution ? '必要なら 100 字以内で、なければ null' : 'null を返す',
  };
}

export function buildArticlePrompt({ japaneseName, scientificName, safety, combinedJsonPath, outputJsonPath }) {
  const hints = safetyHints(safety);
  return `あなたは日本の菌類図鑑の編集者です。以下のルールを厳守して、指定種の図鑑データを JSON で合成してください。

# 対象種
- 和名: ${japaneseName}
- 学名: ${scientificName}
- 安全区分: ${safety}

# 一次ソース
${combinedJsonPath} を Read ツールで読み、\`sources.*\` の非 null のみ使用。

# 絶対遵守ルール
${RULES_BLOCK}

# 出力 JSON スキーマ
\`\`\`json
${SCHEMA_BLOCK}
\`\`\`

# season 仕様
${SEASON_SPEC}

# フィールド別ガイド
${FIELD_GUIDE}

# 本種の safety=${safety} に応じた取り扱い
- cooking_preservation: ${hints.cooking}
- poisoning_first_aid: ${hints.poisoning}
- caution: ${hints.caution}

# 完了後
${outputJsonPath} に Write ツールで JSON を書き込む。応答は \`done: <path> (<size>)\` のみ。
`;
}
```

- [ ] **Step 5: テストを実行して通過を確認**

Run: `npx vitest run scripts/phase13/prompt_templates.test.mjs`
Expected: PASS 6 tests

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/prompt_templates.mjs scripts/phase13/prompt_templates.test.mjs scripts/phase13/fixtures/prompt-input-morchella.json
git commit -m "feat(phase13c): プロンプト組立モジュール prompt_templates.mjs を追加"
```

---

## Task 3: 機械検証モジュール `validate_article.mjs`

**Files:**
- Create: `scripts/phase13/validate_article.mjs`
- Create: `scripts/phase13/validate_article.test.mjs`
- Create: `scripts/phase13/fixtures/article-valid-edible.json`
- Create: `scripts/phase13/fixtures/article-valid-deadly.json`
- Create: `scripts/phase13/fixtures/article-invalid-over-length.json`
- Create: `scripts/phase13/fixtures/article-invalid-bullet.json`
- Create: `scripts/phase13/fixtures/article-invalid-missing-season.json`

**責務:** 生成された記事 JSON を検証項目 V1〜V8（spec §4.1）で評価し、`{ errors: [], warnings: [] }` を返す純関数。

- [ ] **Step 1: 正常系 fixture `article-valid-edible.json` を作成**

```json
{
  "names": { "aliases": ["編笠茸"] },
  "season": [{ "start_month": 3, "end_month": 6 }],
  "habitat": ["雑木林"],
  "regions": ["日本"],
  "tree_association": ["サクラ"],
  "similar_species": [{ "ja": "シャグマアミガサタケ", "note": "有毒種として知られる" }],
  "description": "アミガサタケは春に人里近くに生える子嚢菌類のキノコで、頭部が深い網目状になるのが最大の特徴である [1]。",
  "features": "子実体は頭部と柄からなり、全体の高さは8〜15cmに達する。頭部は球形から楕円形で肋脈が網目状に発達する [1]。",
  "cooking_preservation": "フランス料理のソースやパスタの具材としてよく使われる。生食すると中毒を起こすため必ず加熱する [1]。",
  "poisoning_first_aid": null,
  "caution": null,
  "sources": [
    { "name": "Wikipedia ja「アミガサタケ」", "url": "https://ja.wikipedia.org/wiki/xxx", "license": "CC BY-SA 4.0" }
  ],
  "notes": "season は春から初夏を 3-6 月に翻訳"
}
```

- [ ] **Step 2: 正常系 fixture `article-valid-deadly.json` を作成**

```json
{
  "names": { "aliases": ["白毒茸"] },
  "season": [{ "start_month": 8, "end_month": 10 }],
  "habitat": ["ブナ科樹林"],
  "regions": ["日本", "北半球"],
  "tree_association": ["ブナ", "ミズナラ"],
  "similar_species": [{ "ja": "シロシメジ", "note": "柄のツバとツボが決定的に異なる" }],
  "description": "ドクツルタケは猛毒のきのこで致死率が極めて高いことで知られる [1]。",
  "features": "傘は白色で半球形から平らに開く。柄は白色で基部にツボを持ち、ツバを備える [1]。",
  "cooking_preservation": null,
  "poisoning_first_aid": "主要毒素はアマトキシン類で、摂取後6〜24時間の潜伏期を経て胃腸症状が発現する。速やかに医療機関を受診する [1]。",
  "caution": "致死率が極めて高く、一本で成人が死亡する量に達する [1]",
  "sources": [
    { "name": "厚生労働省 自然毒", "url": "https://example.com", "license": "政府標準利用規約" }
  ],
  "notes": "厚労省ソース優先"
}
```

- [ ] **Step 3: 異常系 fixture 3 本を作成**

`article-invalid-over-length.json`: description が 500 字（400 字超過）のもの。他は `article-valid-edible.json` と同じ。
`article-invalid-bullet.json`: features が `・` 箇条書きを含むもの。
`article-invalid-missing-season.json`: `season` フィールドが空配列 `[]`。

各 fixture は手で作る（400字超の文字列は同じ文を繰り返す等で生成可）。

- [ ] **Step 4: 失敗テストを書く**

`scripts/phase13/validate_article.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateArticle, LIMITS } from './validate_article.mjs';

function load(name) {
  return JSON.parse(readFileSync(`scripts/phase13/fixtures/${name}.json`, 'utf8'));
}

describe('validateArticle', () => {
  it('valid-edible は errors なし', () => {
    const result = validateArticle(load('article-valid-edible'), { safety: 'edible' });
    expect(result.errors).toEqual([]);
  });

  it('valid-deadly は errors なし', () => {
    const result = validateArticle(load('article-valid-deadly'), { safety: 'deadly' });
    expect(result.errors).toEqual([]);
  });

  it('V1: 必須フィールド欠損を検出', () => {
    const a = load('article-valid-edible');
    delete a.description;
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors).toContain('V1: description が存在しない');
  });

  it('V2: description の文字数超過を検出', () => {
    const result = validateArticle(load('article-invalid-over-length'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V2: description'))).toBe(true);
  });

  it('V3: 箇条書きマーカーを検出', () => {
    const result = validateArticle(load('article-invalid-bullet'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V3:'))).toBe(true);
  });

  it('V4: 自由文の学名パターンは warning に止まる', () => {
    const a = load('article-valid-edible');
    a.description = 'Morchella esculenta は春のきのこ [1]。';
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V4:'))).toBe(false);
    expect(result.warnings.some(w => w.startsWith('V4:'))).toBe(true);
  });

  it('V5: season の不正値を検出', () => {
    const a = load('article-valid-edible');
    a.season = [{ start_month: 5, end_month: 3 }];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V5:'))).toBe(true);
  });

  it('V5: season 空配列を検出', () => {
    const result = validateArticle(load('article-invalid-missing-season'), { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V5:'))).toBe(true);
  });

  it('V6: edible で cooking_preservation が null だと error', () => {
    const a = load('article-valid-edible');
    a.cooking_preservation = null;
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V6:'))).toBe(true);
  });

  it('V6: deadly で poisoning_first_aid が null だと error', () => {
    const a = load('article-valid-deadly');
    a.poisoning_first_aid = null;
    const result = validateArticle(a, { safety: 'deadly' });
    expect(result.errors.some(e => e.startsWith('V6:'))).toBe(true);
  });

  it('V7: sources 空配列を検出', () => {
    const a = load('article-valid-edible');
    a.sources = [];
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.errors.some(e => e.startsWith('V7:'))).toBe(true);
  });

  it('V8: 出典番号が一度もない自由文は warning', () => {
    const a = load('article-valid-edible');
    a.description = '出典なしの文章です。';
    const result = validateArticle(a, { safety: 'edible' });
    expect(result.warnings.some(w => w.startsWith('V8:'))).toBe(true);
  });
});

describe('LIMITS', () => {
  it('各自由文の上限が定義されている', () => {
    expect(LIMITS.description).toBe(400);
    expect(LIMITS.features).toBe(400);
    expect(LIMITS.cooking_preservation).toBe(400);
    expect(LIMITS.poisoning_first_aid).toBe(400);
    expect(LIMITS.caution).toBe(100);
  });
});
```

- [ ] **Step 5: テストを実行して失敗を確認**

Run: `npx vitest run scripts/phase13/validate_article.test.mjs`
Expected: FAIL — "Cannot find module './validate_article.mjs'"

- [ ] **Step 6: `validate_article.mjs` を実装**

```javascript
/**
 * Phase 13-C: 生成記事 JSON の機械検証。
 * 失敗時は errors[]、軽度は warnings[] に積む。
 */

export const LIMITS = {
  description: 400,
  features: 400,
  cooking_preservation: 400,
  poisoning_first_aid: 400,
  caution: 100,
};

const FREE_TEXT_FIELDS = ['description', 'features', 'cooking_preservation', 'poisoning_first_aid', 'caution'];
const REQUIRED_FIELDS = [
  'names', 'season', 'habitat', 'regions', 'tree_association',
  'similar_species', 'description', 'features',
  'cooking_preservation', 'poisoning_first_aid', 'caution',
  'sources', 'notes',
];

const BULLET_PATTERN = /(^|\n)\s*(・|[-*]\s|\d+[.、)]\s)/;
const SCI_PATTERN = /\b[A-Z][a-z]+ [a-z]+\b/;
const CITATION_PATTERN = /\[\d+\]/;

export function validateArticle(article, { safety }) {
  const errors = [];
  const warnings = [];

  // V1: 必須フィールドの存在
  for (const f of REQUIRED_FIELDS) {
    if (!(f in article)) errors.push(`V1: ${f} が存在しない`);
  }
  if (article.names && !Array.isArray(article.names.aliases)) {
    errors.push('V1: names.aliases が配列でない');
  }

  // V2: 自由文の文字数上限
  for (const f of FREE_TEXT_FIELDS) {
    const v = article[f];
    if (typeof v === 'string' && v.length > LIMITS[f]) {
      errors.push(`V2: ${f} が ${v.length} 字で上限 ${LIMITS[f]} を超過`);
    }
  }

  // V3: 散文形式（箇条書きマーカー禁止）
  for (const f of FREE_TEXT_FIELDS) {
    const v = article[f];
    if (typeof v === 'string' && BULLET_PATTERN.test(v)) {
      errors.push(`V3: ${f} に箇条書きマーカーが含まれる`);
    }
  }

  // V4: 自由文に学名パターンが含まれないか（warning）
  for (const f of FREE_TEXT_FIELDS) {
    const v = article[f];
    if (typeof v === 'string' && SCI_PATTERN.test(v)) {
      warnings.push(`V4: ${f} に学名パターンが含まれる`);
    }
  }

  // V5: season の妥当性
  if (!Array.isArray(article.season) || article.season.length === 0) {
    errors.push('V5: season が空配列または配列でない');
  } else {
    for (const [i, s] of article.season.entries()) {
      const { start_month, end_month } = s ?? {};
      if (
        !Number.isInteger(start_month) || !Number.isInteger(end_month) ||
        start_month < 1 || start_month > 12 ||
        end_month < 1 || end_month > 12 ||
        start_month > end_month
      ) {
        errors.push(`V5: season[${i}] の範囲が不正`);
      }
    }
  }

  // V6: safety と自由文の整合
  const needsCooking = safety === 'edible' || safety === 'caution';
  const needsPoisoning = safety === 'caution' || safety === 'toxic' || safety === 'deadly';
  if (needsCooking && !article.cooking_preservation) {
    errors.push(`V6: safety=${safety} で cooking_preservation が空`);
  }
  if (!needsCooking && article.cooking_preservation) {
    errors.push(`V6: safety=${safety} で cooking_preservation が非空`);
  }
  if (needsPoisoning && !article.poisoning_first_aid) {
    errors.push(`V6: safety=${safety} で poisoning_first_aid が空`);
  }
  if (!needsPoisoning && article.poisoning_first_aid) {
    errors.push(`V6: safety=${safety} で poisoning_first_aid が非空`);
  }

  // V7: sources の妥当性
  if (!Array.isArray(article.sources) || article.sources.length === 0) {
    errors.push('V7: sources が空');
  } else {
    for (const [i, s] of article.sources.entries()) {
      if (!s.name || !s.url || !s.license) {
        errors.push(`V7: sources[${i}] の name/url/license が欠損`);
      }
    }
  }

  // V8: 出典番号の付与（warning）
  for (const f of FREE_TEXT_FIELDS) {
    const v = article[f];
    if (typeof v === 'string' && v.length > 0 && !CITATION_PATTERN.test(v)) {
      warnings.push(`V8: ${f} に出典番号 [N] が一度も出現しない`);
    }
  }

  return { errors, warnings };
}
```

- [ ] **Step 7: テストを実行して通過を確認**

Run: `npx vitest run scripts/phase13/validate_article.test.mjs`
Expected: PASS 13 tests

- [ ] **Step 8: コミット**

```bash
git add scripts/phase13/validate_article.mjs scripts/phase13/validate_article.test.mjs scripts/phase13/fixtures/article-valid-*.json scripts/phase13/fixtures/article-invalid-*.json
git commit -m "feat(phase13c): 機械検証モジュール validate_article.mjs を追加"
```

---

## Task 4: 類似種解決モジュール `similar_species_resolve.mjs`

**Files:**
- Create: `scripts/phase13/similar_species_resolve.mjs`
- Create: `scripts/phase13/similar_species_resolve.test.mjs`
- Create: `scripts/phase13/fixtures/mushrooms-v1-sample.json`

**責務:** AI が返した `similar_species: [{ja, note}]` を v1 `mushrooms.json` とマッチングし、`v1_id` / `scientific` を可能な範囲で補完する純関数。GBIF 呼び出しは本モジュールのスコープ外（後続で必要になれば別モジュール化、Phase 13-C では v1 DB 照合のみ）。

- [ ] **Step 1: fixture `mushrooms-v1-sample.json` を作成**

v1 からの抜粋 3 件（ツキヨタケ、シャグマアミガサタケ、タマゴタケ）を並べる：

```json
[
  {
    "id": "tsukiyotake",
    "names": { "ja": "ツキヨタケ", "scientific": "Omphalotus guepiniiformis", "aliases": ["月夜茸"] }
  },
  {
    "id": "shaguma_amigasatake",
    "names": { "ja": "シャグマアミガサタケ", "scientific": "Gyromitra esculenta", "aliases": [] }
  },
  {
    "id": "tamagotake",
    "names": { "ja": "タマゴタケ", "scientific": "Amanita caesareoides", "aliases": ["卵茸"] }
  }
]
```

- [ ] **Step 2: 失敗テストを書く**

`scripts/phase13/similar_species_resolve.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveSimilarSpecies, buildV1Index } from './similar_species_resolve.mjs';

const v1 = JSON.parse(readFileSync('scripts/phase13/fixtures/mushrooms-v1-sample.json', 'utf8'));

describe('buildV1Index', () => {
  it('ja → entry の Map を作る', () => {
    const idx = buildV1Index(v1);
    expect(idx.get('ツキヨタケ').id).toBe('tsukiyotake');
  });

  it('aliases も引けるキーに含める', () => {
    const idx = buildV1Index(v1);
    expect(idx.get('月夜茸').id).toBe('tsukiyotake');
    expect(idx.get('卵茸').id).toBe('tamagotake');
  });
});

describe('resolveSimilarSpecies', () => {
  it('ja が v1 にあれば v1_id と scientific を補完', () => {
    const input = [{ ja: 'ツキヨタケ', note: '夜光る点で区別' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tsukiyotake');
    expect(out[0].scientific).toBe('Omphalotus guepiniiformis');
    expect(out[0].note).toBe('夜光る点で区別');
  });

  it('ja が aliases にマッチしても解決', () => {
    const input = [{ ja: '卵茸', note: '赤い傘' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tamagotake');
    expect(out[0].scientific).toBe('Amanita caesareoides');
  });

  it('ja が v1 に不在の場合 ja と note のみ残る', () => {
    const input = [{ ja: 'ムニャムニャタケ', note: '架空' }];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].ja).toBe('ムニャムニャタケ');
    expect(out[0].note).toBe('架空');
    expect(out[0].v1_id).toBeUndefined();
    expect(out[0].scientific).toBeUndefined();
  });

  it('空配列を返せる', () => {
    expect(resolveSimilarSpecies([], v1)).toEqual([]);
  });

  it('複数件を独立に解決', () => {
    const input = [
      { ja: 'ツキヨタケ', note: 'A' },
      { ja: 'ムニャムニャタケ', note: 'B' },
      { ja: 'シャグマアミガサタケ', note: 'C' },
    ];
    const out = resolveSimilarSpecies(input, v1);
    expect(out[0].v1_id).toBe('tsukiyotake');
    expect(out[1].v1_id).toBeUndefined();
    expect(out[2].v1_id).toBe('shaguma_amigasatake');
  });
});
```

- [ ] **Step 3: テストを実行して失敗を確認**

Run: `npx vitest run scripts/phase13/similar_species_resolve.test.mjs`
Expected: FAIL

- [ ] **Step 4: `similar_species_resolve.mjs` を実装**

```javascript
/**
 * Phase 13-C: AI が返した similar_species[] を v1 mushrooms.json と照合し、
 * v1_id / scientific を可能な範囲で補完する純関数。
 */

export function buildV1Index(mushrooms) {
  const idx = new Map();
  for (const m of mushrooms) {
    if (m.names?.ja) idx.set(m.names.ja, m);
    for (const alias of m.names?.aliases ?? []) {
      if (!idx.has(alias)) idx.set(alias, m);
    }
  }
  return idx;
}

export function resolveSimilarSpecies(items, v1Mushrooms) {
  const idx = buildV1Index(v1Mushrooms);
  return items.map(({ ja, note }) => {
    const hit = idx.get(ja);
    if (hit) {
      return {
        ja,
        note,
        v1_id: hit.id,
        scientific: hit.names.scientific,
      };
    }
    return { ja, note };
  });
}
```

- [ ] **Step 5: テストを実行して通過を確認**

Run: `npx vitest run scripts/phase13/similar_species_resolve.test.mjs`
Expected: PASS 6 tests

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/similar_species_resolve.mjs scripts/phase13/similar_species_resolve.test.mjs scripts/phase13/fixtures/mushrooms-v1-sample.json
git commit -m "feat(phase13c): 類似種 v1 DB 解決モジュール similar_species_resolve.mjs を追加"
```

---

## Task 5: オーケストレータ `generate_articles.mjs`（非 AI 部分）

**Files:**
- Create: `scripts/phase13/generate_articles.mjs`
- Create: `scripts/phase13/generate_articles.test.mjs`

**責務:** 対象種の選定、combined JSON の存在チェック、プロンプト文字列の書き出し、検証実行、結果レポート。AI 呼び出し本体は担わず、subagent に渡す「プロンプト一覧ファイル」を生成する。

**CLI:**
```
node scripts/phase13/generate_articles.mjs --prepare   # 対象を解決してプロンプト群を書き出す
node scripts/phase13/generate_articles.mjs --validate  # 既存出力を検証してレポート生成
```

- [ ] **Step 1: 失敗テストを書く（対象種解決）**

`scripts/phase13/generate_articles.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { resolveTier0Targets, tier0ToPromptInput } from './generate_articles.mjs';

describe('resolveTier0Targets', () => {
  it('ranking から tier=0 のみ抽出', () => {
    const ranking = {
      species: [
        { scientificName: 'A sp1', japaneseName: 'ア', tier: 0, toxicity: 'edible' },
        { scientificName: 'B sp2', japaneseName: 'イ', tier: 1, toxicity: 'edible' },
        { scientificName: 'C sp3', japaneseName: 'ウ', tier: 0, toxicity: 'deadly' },
      ],
    };
    const out = resolveTier0Targets(ranking);
    expect(out.map(x => x.japaneseName)).toEqual(['ア', 'ウ']);
  });
});

describe('tier0ToPromptInput', () => {
  it('prompt_templates.mjs の入力形式に整形', () => {
    const target = { scientificName: 'Morchella esculenta', japaneseName: 'アミガサタケ', toxicity: 'edible' };
    const out = tier0ToPromptInput(target);
    expect(out.scientificName).toBe('Morchella esculenta');
    expect(out.japaneseName).toBe('アミガサタケ');
    expect(out.safety).toBe('edible');
    expect(out.combinedJsonPath).toBe('.cache/phase13/combined/Morchella_esculenta.json');
    expect(out.outputJsonPath).toBe('.cache/phase13/generated/Morchella_esculenta.json');
  });

  it('v1 の edible_caution を v2 の caution に正規化', () => {
    const target = { scientificName: 'Foo bar', japaneseName: 'フー', toxicity: 'edible_caution' };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('caution');
  });

  it('v1 の deadly_toxic を v2 の deadly に正規化', () => {
    const target = { scientificName: 'Foo bar', japaneseName: 'フー', toxicity: 'deadly_toxic' };
    const out = tier0ToPromptInput(target);
    expect(out.safety).toBe('deadly');
  });

  it('空白を含む学名もスラッグ化', () => {
    const target = { scientificName: 'Amanita cf. muscaria', japaneseName: 'ア', toxicity: 'toxic' };
    const out = tier0ToPromptInput(target);
    expect(out.combinedJsonPath).toBe('.cache/phase13/combined/Amanita_cf_muscaria.json');
  });
});
```

- [ ] **Step 2: テストを実行して失敗を確認**

Run: `npx vitest run scripts/phase13/generate_articles.test.mjs`
Expected: FAIL

- [ ] **Step 3: `generate_articles.mjs` の pure 関数部分を実装**

```javascript
/**
 * Phase 13-C: AI 合成オーケストレータ（非 AI 部分）。
 * - 対象種の解決
 * - プロンプト組立と書き出し
 * - 生成結果の検証レポート
 *
 * Usage:
 *   node scripts/phase13/generate_articles.mjs --prepare
 *   node scripts/phase13/generate_articles.mjs --validate
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { buildArticlePrompt } from './prompt_templates.mjs';
import { validateArticle } from './validate_article.mjs';

const RANKING_PATH = 'data/species-ranking.json';
const COMBINED_DIR = '.cache/phase13/combined';
const GENERATED_DIR = '.cache/phase13/generated';
const PROMPTS_DIR = '.cache/phase13/prompts';
const REPORT_PATH = '.cache/phase13/generation-report.json';

export function scientificNameToSlug(sci) {
  return sci.replace(/[^A-Za-z0-9]+/g, '_');
}

export function resolveTier0Targets(ranking) {
  return (ranking.species ?? []).filter(s => s.tier === 0);
}

export function normalizeSafety(toxicity) {
  if (toxicity === 'edible_caution') return 'caution';
  if (toxicity === 'deadly_toxic') return 'deadly';
  return toxicity;
}

export function tier0ToPromptInput(target) {
  const slug = scientificNameToSlug(target.scientificName);
  return {
    japaneseName: target.japaneseName,
    scientificName: target.scientificName,
    safety: normalizeSafety(target.toxicity),
    combinedJsonPath: `${COMBINED_DIR}/${slug}.json`,
    outputJsonPath: `${GENERATED_DIR}/${slug}.json`,
  };
}

function prepare() {
  const ranking = JSON.parse(readFileSync(RANKING_PATH, 'utf8'));
  const targets = resolveTier0Targets(ranking);
  mkdirSync(PROMPTS_DIR, { recursive: true });
  mkdirSync(GENERATED_DIR, { recursive: true });

  const manifest = [];
  for (const t of targets) {
    const input = tier0ToPromptInput(t);
    const slug = scientificNameToSlug(t.scientificName);
    const hasCombined = existsSync(input.combinedJsonPath);
    const prompt = buildArticlePrompt(input);
    const promptPath = `${PROMPTS_DIR}/${slug}.txt`;
    writeFileSync(promptPath, prompt, 'utf8');
    manifest.push({
      slug,
      japaneseName: t.japaneseName,
      scientificName: t.scientificName,
      safety: input.safety,
      hasCombined,
      promptPath,
      outputPath: input.outputJsonPath,
    });
  }
  writeFileSync(`${PROMPTS_DIR}/manifest.json`, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`prepared ${targets.length} targets`);
  console.log(`  with combined source: ${manifest.filter(m => m.hasCombined).length}`);
  console.log(`  missing combined source: ${manifest.filter(m => !m.hasCombined).length}`);
  console.log(`manifest: ${PROMPTS_DIR}/manifest.json`);
}

function validate() {
  const manifest = JSON.parse(readFileSync(`${PROMPTS_DIR}/manifest.json`, 'utf8'));
  const report = [];
  for (const m of manifest) {
    if (!existsSync(m.outputPath)) {
      report.push({ slug: m.slug, status: 'missing', errors: [], warnings: [] });
      continue;
    }
    const article = JSON.parse(readFileSync(m.outputPath, 'utf8'));
    const { errors, warnings } = validateArticle(article, { safety: m.safety });
    report.push({
      slug: m.slug,
      japaneseName: m.japaneseName,
      status: errors.length === 0 ? 'pass' : 'needs_regeneration',
      errors,
      warnings,
      outputBytes: statSync(m.outputPath).size,
    });
  }
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  const pass = report.filter(r => r.status === 'pass').length;
  const missing = report.filter(r => r.status === 'missing').length;
  const ng = report.filter(r => r.status === 'needs_regeneration').length;
  console.log(`validated: ${pass} pass / ${ng} needs_regeneration / ${missing} missing`);
  console.log(`report: ${REPORT_PATH}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode === '--prepare') prepare();
  else if (mode === '--validate') validate();
  else {
    console.error('Usage: node generate_articles.mjs [--prepare|--validate]');
    process.exit(1);
  }
}
```

- [ ] **Step 4: テストを実行して通過を確認**

Run: `npx vitest run scripts/phase13/generate_articles.test.mjs`
Expected: PASS 5 tests

- [ ] **Step 5: 全 phase13 テストを実行して regression がないか確認**

Run: `npx vitest run scripts/phase13/`
Expected: All previous tests PASS + new 24 tests PASS

- [ ] **Step 6: コミット**

```bash
git add scripts/phase13/generate_articles.mjs scripts/phase13/generate_articles.test.mjs
git commit -m "feat(phase13c): 合成オーケストレータ generate_articles.mjs を追加"
```

---

## Task 6: Tier 0 対象の準備（prepare 実行 + combined 欠損補充）

**Files:**
- Modify: `.cache/phase13/combined/<slug>.json`（欠損分のみ新規生成）
- Create: `.cache/phase13/prompts/manifest.json`
- Create: `.cache/phase13/prompts/<slug>.txt` × 68

**Note:** 本 Task は `.cache/` 配下で gitignore 対象のため commit は発生しない。以降の Task で結果ファイルを参照する。

- [ ] **Step 1: prepare を実行**

```bash
node scripts/phase13/generate_articles.mjs --prepare
```

期待出力:
```
prepared 68 targets
  with combined source: <N>
  missing combined source: <68 - N>
manifest: .cache/phase13/prompts/manifest.json
```

- [ ] **Step 2: 不足 combined の補充リストを抽出**

```bash
node -e "const m=require('./.cache/phase13/prompts/manifest.json'); console.log(m.filter(x => !x.hasCombined).map(x => x.scientificName + ' | ' + x.japaneseName).join('\n'))"
```

出力を確認。

- [ ] **Step 3: 不足分を fetch_pilot_sources 相当の処理で補う**

既存 `scripts/phase13/fetch_pilot_sources.mjs` は 10 種ハードコードのため、manifest の欠損種に対応する簡易スクリプトを一時作成：

`scripts/phase13/fetch_tier0_sources.mjs`:

```javascript
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fetchDaikinrinPage } from './daikinrin.mjs';
import { fetchWikipediaJa, fetchWikipediaEn } from './wikipedia.mjs';
import { fetchMhlwEntry } from './mhlw.mjs';
import { fetchRinyaOverview } from './rinya.mjs';
import { fetchTraitCircus } from './trait-circus.mjs';
import { combineSources } from './fetch_sources.mjs';

const manifest = JSON.parse(readFileSync('.cache/phase13/prompts/manifest.json', 'utf8'));
const missing = manifest.filter(m => !m.hasCombined);

async function fetchFor({ scientificName, japaneseName }) {
  const [daikinrin, wikipediaEn, mhlw, rinya, traitCircus] = await Promise.all([
    fetchDaikinrinPage(scientificName, null).catch(() => null),
    fetchWikipediaEn({ scientificName }).catch(() => null),
    fetchMhlwEntry(scientificName).catch(() => null),
    fetchRinyaOverview().catch(() => null),
    fetchTraitCircus(scientificName).catch(() => null),
  ]);
  const jaName = daikinrin?.japaneseName ?? mhlw?.japaneseName ?? japaneseName;
  const wikipediaJa = await fetchWikipediaJa({ japaneseName: jaName, scientificName }).catch(() => null);
  return combineSources({ scientificName, daikinrin, wikipediaJa, wikipediaEn, mhlw, rinya, traitCircus });
}

mkdirSync('.cache/phase13/combined', { recursive: true });
for (const m of missing) {
  const out = `.cache/phase13/combined/${m.slug}.json`;
  if (existsSync(out)) continue;
  console.log(`FETCH ${m.scientificName} (${m.japaneseName})`);
  const combined = await fetchFor(m);
  writeFileSync(out, JSON.stringify(combined, null, 2), 'utf8');
}
console.log('done.');
```

実行:
```bash
node scripts/phase13/fetch_tier0_sources.mjs
```

- [ ] **Step 4: prepare を再実行して全件揃ったか確認**

```bash
node scripts/phase13/generate_articles.mjs --prepare
```

期待: `missing combined source: 0`

- [ ] **Step 5: 一時スクリプトを削除しない（再現性のため残す）**

`scripts/phase13/fetch_tier0_sources.mjs` はこのまま残し、コミット:

```bash
git add scripts/phase13/fetch_tier0_sources.mjs
git commit -m "feat(phase13c): tier0 欠損 combined 補充スクリプト fetch_tier0_sources.mjs"
```

---

## Task 7: 既存パイロット出力を破棄し、統一プロンプトで 68 種合成

**Files:**
- Remove: `.cache/phase13/pilot-output/` 以下すべて（gitignore 対象のため git コミット不要、ローカル削除のみ）
- Create/Populate: `.cache/phase13/generated/<slug>.json` × 68

**実行方式:** Claude Code セッション内で subagent を 5 並列で発射する。各 subagent には `.cache/phase13/prompts/<slug>.txt` の内容を prompt として渡し、`model: "opus"` を指定。完了 subagent が出たら次の slug を発射し、常時 5 並列を維持する。

- [ ] **Step 1: 実行セッションの開始宣言**

Claude Code 内で以下を宣言し、subagent 実行モードに切り替え：

> "Phase 13-C Tier 0 合成を開始。manifest の 68 種を concurrency=5 で順次発射、failures は最終リストで報告。"

- [ ] **Step 2: manifest を読み、68 種を 14 バッチ（5 件 × 14、最後 3 件）に分けて発射**

各バッチは一つの assistant メッセージ内で 5 個の Agent 呼び出しを並列で行う：

```
Agent(description: "Opus 合成: <japaneseName>",
      subagent_type: "general-purpose",
      model: "opus",
      prompt: <プロンプトファイルの内容をそのまま埋め込み>)
```

プロンプトファイルの内容取得:
```bash
cat .cache/phase13/prompts/<slug>.txt
```

各 subagent は「combined JSON を Read → 合成 → 指定パスに Write → `done: <path> (<size>)` を返す」動作のみを行う。

全 14 バッチで 68 個の Agent 呼び出しを完遂。

- [ ] **Step 3: 全バッチ終了後、生成結果を検証**

```bash
node scripts/phase13/generate_articles.mjs --validate
```

期待出力例:
```
validated: 54 pass / 11 needs_regeneration / 3 missing
report: .cache/phase13/generation-report.json
```

- [ ] **Step 4: needs_regeneration と missing の slug を抽出**

```bash
node -e "const r=require('./.cache/phase13/generation-report.json'); console.log(r.filter(x => x.status !== 'pass').map(x => x.slug + ' | ' + x.status + ' | ' + (x.errors || []).join('; ')).join('\n'))"
```

- [ ] **Step 5: 失敗した slug のみ再発射（最大 1 回）**

Step 2 と同じ要領で、失敗 slug のみ再発射する。ただし concurrency は 3 に抑える（既に枠消費しているため）。

- [ ] **Step 6: 再検証**

```bash
node scripts/phase13/generate_articles.mjs --validate
```

成功基準: `pass >= 54 / 68 (80%)`。未達なら残りは `needs_regeneration` として次 Task のログに記録。

---

## Task 8: 検証済み JSON を `generated/articles/` に commit

**Files:**
- Create: `generated/articles/<slug>.json` × N（N = 検証 pass 数）

- [ ] **Step 1: pass 判定された slug を generated/articles にコピー**

```bash
node -e "
const fs = require('node:fs');
const path = require('node:path');
const report = JSON.parse(fs.readFileSync('.cache/phase13/generation-report.json', 'utf8'));
const src = '.cache/phase13/generated';
const dst = 'generated/articles';
fs.mkdirSync(dst, { recursive: true });
let copied = 0;
for (const r of report) {
  if (r.status !== 'pass') continue;
  fs.copyFileSync(path.join(src, r.slug + '.json'), path.join(dst, r.slug + '.json'));
  copied++;
}
console.log('copied ' + copied + ' files');
"
```

- [ ] **Step 2: コミット**

```bash
git add generated/articles/
git commit -m "feat(phase13c): tier0 <N> 種の合成結果を commit"
```

---

## Task 9: 生成ログと README 更新

**Files:**
- Create: `docs/phase13/generation-log.md`
- Modify: `docs/phase13/README.md`

- [ ] **Step 1: `docs/phase13/generation-log.md` を作成**

報告内容は `.cache/phase13/generation-report.json` から手動で要約：

```markdown
# Phase 13 生成ログ

## 2026-04-14: tier0 batch #1 (N=68)

- モデル: claude-opus-4-6
- プロンプト: `docs/superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md` §2.5 準拠
- 並列度: 5

### 結果

- 合成成功: **<成功数>/68**
- 自動検証 pass: **<pass数>**
- needs_regeneration: **<ng数>**
- 主な検証失敗パターン:
  - V2 (文字数超過): <件数>
  - V3 (箇条書き混入): <件数>
  - V6 (safety 不整合): <件数>

### 要再生成リスト

| slug | japaneseName | errors |
|---|---|---|
| <slug1> | <和名> | V2: description 422字 |
| ... | ... | ... |

### ソース欠損の傾向

- Wikipedia ja ヒットなし: <N 件>
- 厚労省ヒットなし（毒種以外）: <N 件>

### 次アクション

- needs_regeneration は Phase 13-D レビュー UI で人間判定
- ソース欠損種は Phase 13-G 以降の再生成対象候補
```

- [ ] **Step 2: `docs/phase13/README.md` を Phase 13-C 完了状態に更新**

README の `## サブフェーズ` セクションを以下に書き換える：

```markdown
- [x] Phase 13-A: データソース収集基盤 — [計画書](../superpowers/plans/2026-04-13-phase13a-data-source-foundation.md)
- [x] Phase 13-B: 種選定 + スコアリング — [計画書](../superpowers/plans/2026-04-13-phase13b-species-selection-scoring.md)
- [x] Phase 13-B': シノニム正規化層追加 — [計画書](../superpowers/plans/2026-04-14-phase13b-prime-synonym-normalization.md)
- [x] Phase 13-C: AI 合成パイプライン — [計画書](../superpowers/plans/2026-04-14-phase13c-ai-synthesis.md) / [設計書](../superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md)
- [ ] Phase 13-D: レビューツール拡張
- [ ] Phase 13-E: 軽量スキーマ移行
- [ ] Phase 13-F: v2.0 リリース
```

末尾に以下を追記：

```markdown
## Phase 13-C の使い方

Phase 13-A/B の成果物（combined source + ranking）を入力として Opus 4.6 で記事 JSON を合成する。

### 1. prepare（対象解決 + プロンプト書き出し）

\`\`\`bash
node scripts/phase13/generate_articles.mjs --prepare
\`\`\`

`.cache/phase13/prompts/manifest.json` と `.cache/phase13/prompts/<slug>.txt` が生成される。

### 2. 合成（Claude Code セッション内）

manifest の各 slug について Agent ツールで `model: "opus"` を指定して発射。concurrency 5 推奨。

### 3. 検証

\`\`\`bash
node scripts/phase13/generate_articles.mjs --validate
\`\`\`

`.cache/phase13/generation-report.json` に各 slug の pass / needs_regeneration を出力。

### 4. 採用候補の commit

pass 判定を `generated/articles/` にコピーして commit（手動 or スクリプト化）。

詳細は [計画書](../superpowers/plans/2026-04-14-phase13c-ai-synthesis.md) を参照。
```

- [ ] **Step 3: コミット**

```bash
git add docs/phase13/generation-log.md docs/phase13/README.md
git commit -m "docs(phase13c): 生成ログと README を Phase 13-C 完了状態に更新"
```

---

## Task 10: progress.md に Phase 13-C 完了を記録

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Phase 13-B' セクションの後に Phase 13-C セクションを追加**

`docs/progress.md` の末尾（Phase 13-B' 以降）に以下を追記：

```markdown
## Phase 13-C: AI 合成パイプライン — 完了

完了日: 2026-04-14
設計書: [docs/superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md](./superpowers/specs/2026-04-14-phase13c-ai-synthesis-design.md)
計画書: [docs/superpowers/plans/2026-04-14-phase13c-ai-synthesis.md](./superpowers/plans/2026-04-14-phase13c-ai-synthesis.md)

### 成果

- プロンプト組立モジュール `prompt_templates.mjs`（unit test 6 件）
- 機械検証モジュール `validate_article.mjs`（V1〜V8、unit test 13 件）
- 類似種 v1 DB 解決モジュール `similar_species_resolve.mjs`（unit test 6 件）
- オーケストレータ `generate_articles.mjs`（--prepare / --validate、unit test 5 件）
- Tier 0 補充 fetcher `fetch_tier0_sources.mjs`
- Tier 0 68 種の初回合成を Opus 4.6 subagent 並列（concurrency 5）で完走
- `generated/articles/<slug>.json` × <N> 件を commit

### パイプライン方針

- AI 呼び出しは Claude Code セッション内 subagent で行う（サブスク枠内、Node API 直叩きは後送り）
- 非 AI 部分（対象解決・プロンプト組立・検証）を Node CLI に分離
- Phase 13-A/B と同じ fixture 駆動 unit test パターンを踏襲

### 出力スキーマの v1 との差分

- `season` を配列化（シイタケ等の春秋 2 期対応）
- `similar_species` を `{ja, note, v1_id?, scientific?}` にリッチ化
- `sources[]` と `notes` を必須化
- `toxicity` enum は Phase 13-C では v1 値を `safety` に正規化（edible_caution → caution、deadly_toxic → deadly）、最終呼称は Phase 13-E で決定

### テスト

- `scripts/phase13/` で既存 111 + 新規 30 = **141 tests 全パス**

### 次フェーズ

Phase 13-D（レビューツール拡張、v1/v2 差分 UI）で `generated/articles/` を人間レビューに掛ける。
```

- [ ] **Step 2: コミット**

```bash
git add docs/progress.md
git commit -m "docs(phase13c): progress.md に Phase 13-C 完了記録を追加"
```

---

## Spec Coverage Self-Review

| 設計書 §  | 内容 | Task |
|---|---|---|
| §1 | 目的・スコープ | Task 7 (tier0 のみ、tier1+ は対象外で進む) |
| §2.1 | モデル = Opus 4.6 | Task 7 で `model: "opus"` 明示 |
| §2.2 | パイロット確定事項 | Task 2 プロンプト本体に反映 |
| §2.3 | 出力 JSON スキーマ | Task 2 SCHEMA_BLOCK、Task 3 REQUIRED_FIELDS |
| §2.4 | 自由文フィールドガイド | Task 2 FIELD_GUIDE |
| §2.5 | プロンプト（確定版） | Task 2 buildArticlePrompt |
| §3.1 | CLI | Task 5 (--prepare/--validate) |
| §3.2 | 処理フロー | Task 5〜8 |
| §3.3 | ディレクトリ | Task 1、Task 5 |
| §3.4 | similar_species 後処理 | Task 4 (v1 DB マッチのみ。GBIF 未解決はスコープ外) |
| §4.1 | 検証項目 V1〜V8 | Task 3 validateArticle |
| §4.2 | validate_article.mjs | Task 3 |
| §4.3 | レビューログ | Task 9 (generation-log.md) |
| §5 | スキーマ差分記録 | Task 10 (progress.md に明記) |
| §6 | 出力先と git 運用 | Task 1, Task 8 |
| §7 | リスク対策 | 各 Task 内（concurrency 制限・再生成 1 回まで等） |
| §8 | 成功基準 | Task 7 Step 6 (pass >= 80%) |

未カバー / 後送り: similar_species の GBIF 解決（Phase 13-D 以降に委譲、Task 4 コメントで明記）。

---

## 実装中の落とし穴

- **Claude Code セッションの Agent 並列上限**: Max 5x プランで concurrency > 5 は枠消費が急加速する。5 を上限とする
- **combined JSON の欠損**: daikinrin は MycoBank 未解決でほぼゼロ、Trait Circus は一部属で欠損。Task 6 Step 3 の fetcher で許容範囲の欠損でも続行する（5 ソース中 2 以上あれば合成可の想定）
- **プロンプト長**: 1 プロンプトは 2〜3KB 程度、combined JSON 埋め込みなしで subagent がファイル Read する方式のため prompt 自体は短い。embed するとトータル 50KB 超えるケースがあり注意
- **V6 の整合性**: caution は edible/toxic/deadly すべてで optional。spec §2.3 に「危険種のみ」とあるので edible で caution 非空は警告相当にすべきかは未定だが、今回の実装ではエラー扱いで安全側に倒す
- **similar_species の alias 一致**: v1 aliases に登録されていない表記ゆれ（旧字体・カタカナ別表記）は後段で補足。初回は unresolved で残す
- **プロンプトの変更時**: `prompt_templates.mjs` を変更したら `manifest.json` の `promptPath` は上書きされるが、既生成の `.cache/phase13/generated/<slug>.json` は残るため、再生成時は generated 配下を手動で削除してから --prepare → 合成実行

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-14-phase13c-ai-synthesis.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 各 Task を fresh subagent にディスパッチ、タスク間でレビュー、fast iteration
2. **Inline Execution** — 本セッション内で executing-plans を使いバッチ実行、チェックポイントでレビュー

Task 7（本番合成）は subagent 並列発射を本体とするため、本セッション内実行（Inline）との相性が高い。Task 1〜5 は Subagent-Driven でも Inline でも可。

どちらで進めますか？
