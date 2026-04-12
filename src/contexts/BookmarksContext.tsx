'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { addBookmark, getAllBookmarks, removeBookmark } from '@/lib/db';
import type { Bookmark } from '@/types/bookmark';

interface BookmarksContextValue {
  bookmarks: Bookmark[];
  isLoading: boolean;
  /** Fast membership check. */
  isBookmarked: (mushroomId: string) => boolean;
  /** Toggle bookmark for the given mushroom id. */
  toggleBookmark: (mushroomId: string) => Promise<void>;
  reload: () => Promise<void>;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getAllBookmarks();
        if (!cancelled) setBookmarks(all);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Membership set for O(1) isBookmarked lookups.
  const idSet = useMemo(() => new Set(bookmarks.map((b) => b.mushroom_id)), [bookmarks]);

  const isBookmarked = useCallback((mushroomId: string) => idSet.has(mushroomId), [idSet]);

  const toggleBookmark = useCallback(async (mushroomId: string) => {
    if (idSet.has(mushroomId)) {
      await removeBookmark(mushroomId);
      setBookmarks((prev) => prev.filter((b) => b.mushroom_id !== mushroomId));
    } else {
      const added = await addBookmark(mushroomId);
      setBookmarks((prev) => [added, ...prev]);
    }
  }, [idSet]);

  const reload = useCallback(async () => {
    const all = await getAllBookmarks();
    setBookmarks(all);
  }, []);

  return (
    <BookmarksContext.Provider value={{ bookmarks, isLoading, isBookmarked, toggleBookmark, reload }}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks(): BookmarksContextValue {
  const context = useContext(BookmarksContext);
  if (!context) throw new Error('useBookmarks must be used within BookmarksProvider');
  return context;
}
