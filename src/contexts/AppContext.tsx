'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';
import { mushrooms } from '@/data/mushrooms';
import { runV3ToV4Migration } from '@/lib/migrations/v3-to-v4';
import { getAllBookmarks, removeBookmark, getAllRecords, updateRecord, getMigration, recordMigration } from '@/lib/db';
import type { MigrationRecord } from '@/types/migration';

interface AppState {
  isOnline: boolean;
  apiKey: string | null;
  preferredRegions: string[];
  theme: 'light' | 'dark' | 'system';
  isHydrated: boolean;
  /** Phase 13-F v3→v4 マイグレーション結果。null = 未実行/実行中。 */
  migration: MigrationRecord | null;
}

type AppAction =
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_API_KEY'; payload: string | null }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_HYDRATED' }
  | { type: 'SET_MIGRATION'; payload: MigrationRecord };

const DEFAULT_STATE: AppState = {
  isOnline: true,
  apiKey: null,
  preferredRegions: [],
  theme: 'system',
  isHydrated: false,
  migration: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONLINE': return { ...state, isOnline: action.payload };
    case 'SET_API_KEY':
      if (action.payload) localStorage.setItem('anthropic_api_key', action.payload);
      else localStorage.removeItem('anthropic_api_key');
      return { ...state, apiKey: action.payload };
    case 'SET_REGIONS': return { ...state, preferredRegions: action.payload };
    case 'SET_THEME': return { ...state, theme: action.payload };
    case 'SET_HYDRATED': return { ...state, isHydrated: true };
    case 'SET_MIGRATION': return { ...state, migration: action.payload };
    default: return state;
  }
}

interface AppContextValue { state: AppState; dispatch: Dispatch<AppAction>; }

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, DEFAULT_STATE);

  // Hydrate client-only values after mount
  useEffect(() => {
    const savedKey = localStorage.getItem('anthropic_api_key');
    if (savedKey) {
      dispatch({ type: 'SET_API_KEY', payload: savedKey });
    }
    dispatch({ type: 'SET_HYDRATED' });
    dispatch({ type: 'SET_ONLINE', payload: navigator.onLine });

    // Phase 13-F: v2 移行データクリーンアップ。冪等なので毎回呼んで安全。
    // db.open() の完了を待たずに呼んでも Dexie が内部キューイングする。
    void runV3ToV4Migration(
      new Set(mushrooms.map((m) => m.id)),
      {
        getExistingMigration: getMigration,
        getAllBookmarks,
        removeBookmark,
        getAllRecords,
        updateRecord,
        recordMigration,
      }
    )
      .then((result) => dispatch({ type: 'SET_MIGRATION', payload: result }))
      .catch((err) => {
        console.error('[migration v3-to-v4] failed:', err);
      });

    const handleOnline = () => dispatch({ type: 'SET_ONLINE', payload: true });
    const handleOffline = () => dispatch({ type: 'SET_ONLINE', payload: false });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
