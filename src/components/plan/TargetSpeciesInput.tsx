'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { MushroomCombobox } from '@/components/records/MushroomCombobox';

interface TargetSpeciesInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

/**
 * 複数選択版の採取計画用キノコ入力。
 * 記録画面の MushroomCombobox（単一選択, searchMushrooms で 300種リアルタイム候補）を
 * 内部で利用し、候補選択 or 自由入力の Enter 確定で chip を追加する。
 *
 * - searchMushrooms 参照なので図鑑データ追加に自動追従
 * - 重複追加は無視
 * - chip の × で削除
 */
export function TargetSpeciesInput({
  value,
  onChange,
  placeholder,
  id,
}: TargetSpeciesInputProps) {
  const [draft, setDraft] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const addSpecies = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setDraft('');
      setSelectedId('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
    setSelectedId('');
  };

  const removeSpecies = (name: string) => {
    onChange(value.filter((s) => s !== name));
  };

  const handleComboboxChange = (next: string, nextId: string) => {
    // 候補選択時は nextId がセットされるので即 chip 化
    if (nextId) {
      addSpecies(next);
      return;
    }
    setDraft(next);
    setSelectedId('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSpecies(draft);
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      <MushroomCombobox
        id={id}
        value={draft}
        selectedId={selectedId}
        onChange={handleComboboxChange}
        placeholder={placeholder}
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 text-xs bg-soil-elevated text-washi-muted px-2 py-0.5 rounded-full"
            >
              {name}
              <button
                type="button"
                onClick={() => removeSpecies(name)}
                className="text-moss-light hover:text-washi-cream inline-flex items-center"
                aria-label={`${name} を削除`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
