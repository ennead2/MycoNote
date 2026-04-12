'use client';

import { Check } from 'lucide-react';

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

/**
 * Phase 9 パレット準拠のカスタムチェックボックス。
 * 素のネイティブ input の代わりに、moss / washi トークンに合わせた見た目を提供する。
 * ネイティブ input は sr-only で残し、アクセシビリティとフォーカスリングを保つ。
 */
export function Checkbox({ id, checked, onChange, label, disabled = false }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex items-center gap-2 cursor-pointer select-none ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`w-4 h-4 rounded border inline-flex items-center justify-center transition-colors shrink-0 ${
          checked
            ? 'bg-moss-primary border-moss-light'
            : 'bg-soil-surface border-washi-dim'
        } peer-focus-visible:ring-2 peer-focus-visible:ring-moss-light peer-focus-visible:ring-offset-1 peer-focus-visible:ring-offset-soil-bg`}
      >
        {checked && <Check size={12} strokeWidth={3} className="text-washi-cream" />}
      </span>
      <span className="text-xs text-moss-light">{label}</span>
    </label>
  );
}
