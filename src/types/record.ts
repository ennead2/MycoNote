export interface MushroomRecord {
  id: string;
  mushroom_id?: string;
  mushroom_name_ja?: string;
  observed_at: string;
  location: {
    lat: number;
    lng: number;
    description?: string;
  };
  photos: string[];
  quantity?: string;
  memo?: string;
  harvested: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}
