export type Toxicity = 'edible' | 'edible_caution' | 'inedible' | 'toxic' | 'deadly_toxic';

export interface MushroomTaxonomy {
  order: string;       // 目 (例: Agaricales)
  family: string;      // 科 (例: Tricholomataceae)
  genus: string;       // 属 (例: Tricholoma)
}

export interface Mushroom {
  id: string;
  names: {
    ja: string;
    scientific: string;
    /** 検索ヒットさせたい別称・旧和名・旧漢字表記など */
    aliases?: string[];
    /** GBIF で確認された旧学名（taxonomic synonyms）— 検索でヒット、詳細画面に併記 */
    scientific_synonyms?: string[];
  };
  taxonomy?: MushroomTaxonomy;
  toxicity: Toxicity;
  season: {
    start_month: number;
    end_month: number;
  };
  habitat: string[];
  regions: string[];
  image_local: string;
  images_remote: string[];
  images_remote_credits?: string[];
  description: string;
  features: string;
  cooking_preservation?: string;   // 調理法・保存方法（食用・食用要注意種）
  poisoning_first_aid?: string;    // 中毒事例・応急処置（毒・猛毒種）
  similar_species: string[];
  caution?: string;
  tree_association?: string[];
  source_url?: string;
  traits?: MushroomTraits;
  verified?: boolean;              // 外部ソースで検証済みか
}

export interface FilterOptions {
  query?: string;
  toxicity?: Toxicity[];
  season?: number;
  hasRecord?: boolean;
  // Multi-select taxonomy filters
  family?: string[];
  genus?: string[];
  // Multi-select string-array filters (match if mushroom contains any of the selected values)
  habitat?: string[];
  regions?: string[];
  treeAssociation?: string[];
  // Multi-select trait filter
  capColor?: CapColor[];
  // Restrict to bookmarked ids (provided by caller via context)
  bookmarkedIds?: string[];
}

export type SortOrder = 'safety' | 'kana' | 'taxonomy';

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
