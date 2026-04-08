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
}

export interface FilterOptions {
  query?: string;
  toxicity?: Toxicity[];
  season?: number;
  habitat?: string;
  hasRecord?: boolean;
}
