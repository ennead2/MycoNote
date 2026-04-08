'use client';

import { createContext, useContext, useReducer, useEffect, type ReactNode, type Dispatch } from 'react';

interface AppState {
  isOnline: boolean;
  apiKey: string | null;
  preferredRegions: string[];
  theme: 'light' | 'dark' | 'system';
}

type AppAction =
  | { type: 'SET_ONLINE'; payload: boolean }
  | { type: 'SET_API_KEY'; payload: string | null }
  | { type: 'SET_REGIONS'; payload: string[] }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' };

function getInitialState(): AppState {
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('anthropic_api_key') : null;
  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    apiKey,
    preferredRegions: [],
    theme: 'system',
  };
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONLINE': return { ...state, isOnline: action.payload };
    case 'SET_API_KEY':
      if (action.payload) localStorage.setItem('anthropic_api_key', action.payload);
      else localStorage.removeItem('anthropic_api_key');
      return { ...state, apiKey: action.payload };
    case 'SET_REGIONS': return { ...state, preferredRegions: action.payload };
    case 'SET_THEME': return { ...state, theme: action.payload };
    default: return state;
  }
}

interface AppContextValue { state: AppState; dispatch: Dispatch<AppAction>; }

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);
  useEffect(() => {
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
