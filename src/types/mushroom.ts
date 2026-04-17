// v2 schema (Phase 13-F). v1 互換は廃止。
// 旧型 (Toxicity / MushroomTraits / source_url / verified / traits) はリポジトリ履歴を参照。

export type Safety = 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly' | 'unknown';

/**
 * 分類階層の 1 段階。ラテン学名と日本語名（漢字）をペアで保持。
 * 日本語名は大菌輪由来（例: phylum "Basidiomycota" → jp "担子菌門"）。
 */
export interface TaxonomyRank {
  latin: string;
  jp?: string;
}

/**
 * 7 階層 taxonomy (大菌輪の表記に準拠)。Phase 15 で従来の 3 階層 (order/family/genus) から拡張。
 * 旧フィールドは廃止。いずれの階層も欠落可。
 */
export interface MushroomTaxonomy {
  phylum?: TaxonomyRank;     // 門 (例: Basidiomycota 担子菌門)
  subphylum?: TaxonomyRank;  // 亜門 (例: Agaricomycotina ハラタケ亜門)
  class?: TaxonomyRank;      // 綱 (例: Agaricomycetes ハラタケ綱)
  subclass?: TaxonomyRank;   // 亜綱 (例: Agaricomycetidae ハラタケ亜綱)
  order?: TaxonomyRank;      // 目 (例: Agaricales ハラタケ目)
  family?: TaxonomyRank;     // 科 (例: Amanitaceae テングタケ科)
  genus?: TaxonomyRank;      // 属 (例: Amanita テングタケ属)
}

export const TAXONOMY_RANK_ORDER = [
  'phylum',
  'subphylum',
  'class',
  'subclass',
  'order',
  'family',
  'genus',
] as const satisfies ReadonlyArray<keyof MushroomTaxonomy>;

export type TaxonomyRankKey = typeof TAXONOMY_RANK_ORDER[number];

export interface SeasonRange {
  start_month: number;  // 1-12
  end_month: number;    // 1-12
}

export interface SimilarSpecies {
  ja: string;
  note: string;
  /** v2 図鑑内に同一種があれば slug を埋める（詳細リンク用） */
  id?: string;
  /** 学名でも同定可能な場合のヒント */
  scientific?: string;
}

export interface SourceCitation {
  name: string;
  url: string;
  license: string;
}

export interface Mushroom {
  /** scientific name を underscore 区切りにした slug。例: amanita_muscaria */
  id: string;

  names: {
    ja: string;
    scientific: string;
    /** 検索ヒットさせたい別称・旧和名・旧漢字表記など */
    aliases?: string[];
    /** GBIF で確認された旧学名 (taxonomic synonyms) */
    scientific_synonyms?: string[];
  };

  taxonomy?: MushroomTaxonomy;
  safety: Safety;
  /** 1 種が複数発生期を持つことを許容（仕様上 v2 種は被り無し前提） */
  season: SeasonRange[];
  habitat: string[];
  regions: string[];
  tree_association?: string[];

  description: string;
  features: string;
  cooking_preservation: string | null;
  poisoning_first_aid: string | null;
  caution: string | null;

  similar_species: SimilarSpecies[];

  /** 出典・ライセンス（必須） */
  sources: SourceCitation[];
  /** 開発者向けメモ（UI 非表示） */
  notes?: string;

  // 画像系（Phase 13-G で配備。13-F では空でも可）
  image_local: string | null;
  images_remote: string[];
  images_remote_credits?: string[];

  /**
   * 大菌輪統制形質 (Trait Circus Database, CC BY 4.0) から抽出した肉眼観察可能な形質キー。
   * 形式: `element_attribute_value` (例: `pileus_color_brown`)。
   * Phase 15-B S1 で収集、S3 以降の簡易識別エンジンが使用する。
   * 欠落しうる（ウラベニホテイシメジ等 Trait Circus 未収録種は undefined）。
   */
  traits?: string[];
}

// ===== Filter / Sort =====

export interface FilterOptions {
  query?: string;
  safety?: Safety[];
  /** 月 (1-12)。指定されると season に含まれる種のみヒット */
  season?: number;
  hasRecord?: boolean;
  family?: string[];
  genus?: string[];
  habitat?: string[];
  regions?: string[];
  treeAssociation?: string[];
  /** Restrict to bookmarked ids (provided by caller via context) */
  bookmarkedIds?: string[];
}

export type SortOrder = 'safety' | 'kana' | 'taxonomy';
