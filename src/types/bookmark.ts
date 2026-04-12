/**
 * A user-saved mushroom reference (栞 / bookmark).
 * Stored in IndexedDB; one row per bookmarked mushroom.
 */
export interface Bookmark {
  /** Mushroom id (primary key, same as Mushroom.id). */
  mushroom_id: string;
  /** ISO 8601 timestamp when the bookmark was added. */
  created_at: string;
}
