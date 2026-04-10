import type { MushroomRecord } from './record';
import type { ChatSession } from './chat';

export interface ExportPhoto {
  record_id: string;
  id: string;
  data: string;
  media_type: string;
}

export interface ExportData {
  version: 1;
  exported_at: string;
  app_version: string;
  records: MushroomRecord[];
  photos?: ExportPhoto[];
  chatSessions: ChatSession[];
}

export interface ImportResult {
  recordsAdded: number;
  recordsSkipped: number;
  chatSessionsAdded: number;
  chatSessionsSkipped: number;
  photosAdded: number;
}
