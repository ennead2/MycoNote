export type Toxicity = 'edible' | 'edible_caution' | 'inedible' | 'toxic' | 'deadly_toxic';

export interface Mushroom {
  id: string;
  names: {
    ja: string;
    scientific: string;
    aliases?: string[];
  };
  toxicity: Toxicity;
  season: {
    start_month: number;
    end_month: number;
  };
  habitat: string[];
  regions: string[];
  image_local: string;
  images_remote: string[];
  description: string;
  features: string;
  similar_species: string[];
  caution?: string;
  tree_association?: string[];
  source_url?: string;
  traits?: MushroomTraits;
}

export interface FilterOptions {
  query?: string;
  toxicity?: Toxicity[];
  season?: number;
  habitat?: string;
  hasRecord?: boolean;
}

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
