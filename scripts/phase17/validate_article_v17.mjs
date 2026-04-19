/**
 * Phase 17 合成記事の validator。
 *
 * Phase 13 validate_article.mjs との差分:
 *  - habitat / season / taxonomy / synonyms は合成対象外なので check しない
 *  - 文字数上限は tier 別 (0=400, 1=300, 2=160/160/null/160/100)
 *  - safety vs mhlw の致命衝突を検出 (resolveSafety 側でも弾くが二重 check)
 *  - 学名・分類階層が自由文に含まれていないことを強く check
 *  - similar_species.note が 50 字以下
 *  - regions 配列の海外地名羅列を検出 (>8 件で warning)
 *
 * 入力:
 *   article: 合成結果 JSON
 *   context: {
 *     tier, safety, japaneseName, scientificName, synonyms,
 *     similarSuggestionJas: string[]   // 大菌輪「比較対象として」の和名 allowlist
 *   }
 *
 * 出力:
 *   { errors: string[], warnings: string[] }
 */
import { PHASE17_CHAR_LIMITS } from './prompt_templates_v17.mjs';
import { matchMhlw } from './resolve_safety.mjs';

const FREE_TEXT_FIELDS = ['description', 'features', 'cooking_preservation', 'poisoning_first_aid', 'caution'];

// 典型的な分類階層語 (これらが自由文に含まれれば warn)
const TAXONOMY_WORDS = ['綱', '亜綱', '目', '科', '属', '亜門', '門'];

export function validatePhase17Article(article, context) {
  const errors = [];
  const warnings = [];
  const { tier, safety: inputSafety, japaneseName, scientificName, synonyms = [], similarSuggestionJas = [] } = context;

  if (!article || typeof article !== 'object') {
    errors.push('article is not an object');
    return { errors, warnings };
  }

  const limits = PHASE17_CHAR_LIMITS[tier];
  if (!limits) {
    errors.push(`unknown tier: ${tier}`);
    return { errors, warnings };
  }

  // 出力 safety を取得 (AI が設定したもの or 入力継承)
  const outputSafety = article.safety || inputSafety;
  const validSafeties = ['edible', 'caution', 'inedible', 'toxic', 'deadly', 'unknown'];
  if (!validSafeties.includes(outputSafety)) {
    errors.push(`invalid safety value: "${outputSafety}"`);
  }

  // mhlw 該当種は AI が safety を覆していないか
  const mhlw = matchMhlw({ japaneseName, scientificName, synonyms });
  if (mhlw && inputSafety !== 'unknown' && outputSafety !== inputSafety) {
    errors.push(`CRITICAL: mhlw 該当種で AI が safety を覆した (input=${inputSafety}, output=${outputSafety})`);
  }

  // 1. 文字数上限
  checkCharLimit(article, 'description', limits.description, errors);
  checkCharLimit(article, 'features', limits.features, errors);
  if (limits.cooking !== null) {
    checkCharLimit(article, 'cooking_preservation', limits.cooking, errors);
  }
  checkCharLimit(article, 'poisoning_first_aid', limits.poisoning, errors);
  checkCharLimit(article, 'caution', limits.caution, errors);

  // 2. 出力 safety に応じた null/非 null 整合性
  const canEat = outputSafety === 'edible' || outputSafety === 'caution';
  const canPoison = outputSafety === 'caution' || outputSafety === 'toxic' || outputSafety === 'deadly';
  if (!canEat && article.cooking_preservation != null) {
    errors.push(`cooking_preservation must be null when safety=${outputSafety} (got non-null)`);
  }
  if (!canPoison && article.poisoning_first_aid != null && outputSafety !== 'inedible') {
    errors.push(`poisoning_first_aid must be null when safety=${outputSafety} (got non-null)`);
  }
  if (outputSafety === 'edible' && article.caution != null) {
    errors.push(`caution must be null when safety=edible (got non-null)`);
  }
  // 危険種で poisoning_first_aid が null なのは incomplete (再生成対象)
  if (canPoison && article.poisoning_first_aid == null) {
    errors.push(`poisoning_first_aid required when safety=${outputSafety} (got null)`);
  }
  // 食可能種で cooking_preservation が null なのも incomplete
  if (canEat && article.cooking_preservation == null) {
    errors.push(`cooking_preservation required when safety=${outputSafety} (got null)`);
  }

  // 3. mhlw 致命衝突 (出力 safety で判定)
  if (mhlw && outputSafety === 'edible') {
    errors.push(
      `CRITICAL: safety=edible but ${japaneseName} (${scientificName}) is in mhlw 19-species list (would cause lethal misidentification)`,
    );
  }

  // 4. Wikipedia JA 参照確認 (sources に wikipedia ja が含まれるか)
  // tier 0 (WP JA あり) で sources に Wikipedia ja が無いのは未参照 → 再生成対象
  if (tier === 0 && Array.isArray(article.sources)) {
    const hasWpJa = article.sources.some((s) => {
      const name = (s?.name || '').toLowerCase();
      const url = (s?.url || '').toLowerCase();
      return name.includes('wikipedia') && (name.includes('ja') || name.includes('日本') || url.includes('ja.wikipedia'));
    });
    if (!hasWpJa) {
      errors.push('tier 0 article missing Wikipedia JA in sources (re-synthesis required)');
    }
  }

  // 4. 学名が自由文に含まれる
  for (const f of FREE_TEXT_FIELDS) {
    const v = article[f];
    if (typeof v !== 'string') continue;
    if (v.includes(scientificName)) {
      errors.push(`${f} contains scientific name "${scientificName}" (forbidden)`);
    }
    if (v.includes(`${scientificName.split(' ')[0]}属`)) {
      warnings.push(`${f} mentions genus name, consider removal`);
    }
    // 分類階層語の存在は warning (「ハラタケ科」等)
    for (const tw of TAXONOMY_WORDS) {
      if (v.includes(tw)) {
        warnings.push(`${f} contains taxonomy term "${tw}"`);
        break;
      }
    }
  }

  // 5. similar_species の note 長さ
  if (Array.isArray(article.similar_species)) {
    article.similar_species.forEach((s, i) => {
      if (!s || typeof s !== 'object') {
        errors.push(`similar_species[${i}] is not object`);
        return;
      }
      if (!s.ja || typeof s.ja !== 'string') {
        errors.push(`similar_species[${i}].ja missing`);
      }
      if (s.note && typeof s.note === 'string' && [...s.note].length > 50) {
        errors.push(`similar_species[${i}].note > 50 chars: ${[...s.note].length}`);
      }
      // allowlist check (warn のみ)
      if (similarSuggestionJas.length > 0 && s.ja && !similarSuggestionJas.includes(s.ja)) {
        warnings.push(`similar_species[${i}].ja "${s.ja}" is not in daikinrin similar_suggestion allowlist`);
      }
    });
  }

  // 6. regions 羅列チェック
  if (Array.isArray(article.regions) && article.regions.length > 8) {
    warnings.push(`regions has ${article.regions.length} entries (>8), consider consolidation`);
  }

  // 7. sources 必須
  if (!Array.isArray(article.sources) || article.sources.length === 0) {
    errors.push('sources missing or empty');
  } else {
    article.sources.forEach((s, i) => {
      if (!s?.name || !s?.url) {
        errors.push(`sources[${i}] missing name or url`);
      }
    });
  }

  return { errors, warnings };
}

function checkCharLimit(article, field, limit, errors) {
  const v = article[field];
  if (v == null) return;
  if (typeof v !== 'string') {
    errors.push(`${field} must be string or null`);
    return;
  }
  const len = [...v].length;
  if (len > limit) {
    errors.push(`${field} > ${limit} chars: ${len}`);
  }
}
