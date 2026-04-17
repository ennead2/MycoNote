// v2 schema (Phase 13-F). v1 互換は廃止。
// 旧型 (Toxicity / MushroomTraits / source_url / verified / traits) はリポジトリ履歴を参照。

export type Safety = 'edible' | 'caution' | 'inedible' | 'toxic' | 'deadly' | 'unknown';

export interface MushroomTaxonomy {
  order?: string;       // 目 (例: Agaricales)
  family?: string;      // 科 (例: Tricholomataceae)
  genus?: string;       // 属 (例: Tricholoma)
}

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
