import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import type { ReactNode } from 'react';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.state.isOnline).toBe(true);
    expect(result.current.state.apiKey).toBeNull();
    expect(result.current.state.preferredRegions).toEqual([]);
  });

  it('restores API key from localStorage', () => {
    localStorage.setItem('anthropic_api_key', 'sk-test-key');
    const { result } = renderHook(() => useApp(), { wrapper });
    expect(result.current.state.apiKey).toBe('sk-test-key');
  });

  it('updates API key and persists to localStorage', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_API_KEY', payload: 'sk-new-key' });
    });
    expect(result.current.state.apiKey).toBe('sk-new-key');
    expect(localStorage.getItem('anthropic_api_key')).toBe('sk-new-key');
  });

  it('clears API key from localStorage when set to null', () => {
    localStorage.setItem('anthropic_api_key', 'sk-old');
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_API_KEY', payload: null });
    });
    expect(result.current.state.apiKey).toBeNull();
    expect(localStorage.getItem('anthropic_api_key')).toBeNull();
  });

  it('updates online status', () => {
    const { result } = renderHook(() => useApp(), { wrapper });
    act(() => {
      result.current.dispatch({ type: 'SET_ONLINE', payload: false });
    });
    expect(result.current.state.isOnline).toBe(false);
  });
});
