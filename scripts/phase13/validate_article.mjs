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

  // V9: aliases のカタカナ純度チェック（ラテン文字・数字の混入を error）
  const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
  if (article.names && Array.isArray(article.names.aliases)) {
    for (const [i, alias] of article.names.aliases.entries()) {
      if (typeof alias === 'string' && alias.length > 0 && LATIN_OR_DIGIT.test(alias)) {
        errors.push(`V9: names.aliases[${i}] "${alias}" にラテン文字/数字が含まれる`);
      }
    }
  }

  return { errors, warnings };
}
