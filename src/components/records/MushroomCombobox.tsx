'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import type { Mushroom } from '@/types/mushroom';
import { searchMushrooms } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';

interface MushroomComboboxProps {
  /** Current text shown in the input. */
  value: string;
  /** Mushroom id if the user selected a candidate. Empty when typing freely. */
  selectedId: string;
  /**
   * Called on both typing and selection.
   * - When typing: `selectedId` is '' (no DB match yet).
   * - When a candidate is chosen: the candidate's name and id.
   */
  onChange: (value: string, selectedId: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

/** Cap on how many rows we show so the dropdown doesn't occupy the whole screen. */
const MAX_CANDIDATES = 10;

/**
 * Single input that lets the user either:
 *   1. Type a species name and pick a matching entry from the 図鑑 DB
 *      (real-time filtered candidates), giving us a proper mushroom_id, OR
 *   2. Type any text and submit without picking — stored as free-form
 *      mushroom_name_ja with mushroom_id = undefined.
 *
 * Replaces the prior separate <select> + "manual name" input pair.
 */
export function MushroomCombobox({
  value,
  selectedId,
  onChange,
  placeholder,
  id,
  className = '',
}: MushroomComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const candidates: Mushroom[] = useMemo(() => {
    const q = value.trim();
    if (!q) return [];
    return searchMushrooms({ query: q }).slice(0, MAX_CANDIDATES);
  }, [value]);

  // Close dropdown when the user taps / clicks outside the combobox.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const handleSelect = (m: Mushroom) => {
    onChange(m.names.ja, m.id);
    setOpen(false);
    // Drop focus so the on-screen keyboard closes on mobile.
    inputRef.current?.blur();
  };

  const handleTextInput = (next: string) => {
    // Typing always clears any prior selection — the text is now free-form
    // until the user picks another candidate.
    onChange(next, '');
    setOpen(true);
  };

  const borderClass = selectedId ? 'border-moss-light' : 'border-moss-primary';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => handleTextInput(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && candidates.length > 0}
        aria-controls={id ? `${id}-listbox` : undefined}
        className={`w-full rounded-lg bg-soil-surface border ${borderClass} text-washi-cream placeholder-washi-dim px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-moss-light transition-colors`}
      />

      {/* "登録済みの種" 印 — shown when a candidate is actively selected. */}
      {selectedId && (
        <span
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-moss-light"
          aria-label={UI_TEXT.records.form.mushroomRegistered}
          title={UI_TEXT.records.form.mushroomRegistered}
        >
          <Check size={16} strokeWidth={2.5} aria-hidden="true" />
        </span>
      )}

      {/* Suggestion dropdown */}
      {open && candidates.length > 0 && (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-20 rounded-lg border border-border bg-soil-elevated max-h-64 overflow-y-auto shadow-lg shadow-soil-bg/60"
        >
          {candidates.map((m) => {
            const active = selectedId === m.id;
            return (
              <li key={m.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  // Use onPointerDown + preventDefault so the outside-click
                  // handler can't close the list before onClick fires.
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(m)}
                  className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 border-b border-border last:border-0 transition-colors ${
                    active ? 'bg-moss-primary/30' : 'hover:bg-moss-primary/20 active:bg-moss-primary/30'
                  }`}
                >
                  <span className="text-sm text-washi-cream">{m.names.ja}</span>
                  <span className="text-xs text-washi-muted italic">
                    {m.names.scientific}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
