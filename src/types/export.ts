import type { MushroomRecord } from './record';
import type { ChatSession } from './chat';
import type { Bookmark } from './bookmark';

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
  /** Added in v1.1: optional, backward-compatible with older exports. */
  bookmarks?: Bookmark[];
}

export interface ImportResult {
  recordsAdded: number;
  recordsSkipped: number;
  chatSessionsAdded: number;
  chatSessionsSkipped: number;
  photosAdded: number;
  bookmarksAdded: number;
  bookmarksSkipped: number;
}
