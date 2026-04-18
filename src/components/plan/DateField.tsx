'use client';

import { useEffect, useRef, useState } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ja } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';

export interface DateFieldProps {
  /** 値は "yyyy-mm-dd" 文字列形式（既存 PlanForm との互換のため） */
  value: string;
  onChange: (value: string) => void;
  /** input 要素の id (label for 用) */
  id?: string;
  /** プレースホルダ (date 未選択時のボタン表示) */
  placeholder?: string;
  className?: string;
}

/** "yyyy-mm-dd" (ローカル) → Date */
function parseYMD(s: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

/** Date → "yyyy-mm-dd" (ローカル、UTC ずれ回避) */
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** ボタン表示用: "2026年4月20日(月)" */
function formatButtonLabel(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${y}年${m}月${day}日 (${weekday})`;
}

/**
 * DESIGN.md トークンに沿った日付入力コンポーネント (Phase 15 追加調整)。
 *
 * native `<input type="date">` はブラウザ側の accent-color (Windows は紫) で
 * ポップアップの色を制御できないため、react-day-picker を埋め込む。
 *
 * 外側は <input type="hidden"> で value 同期（既存 form の互換）、表示はボタン。
 * タップで Popover 風の DayPicker を展開、外クリック / ESC / 選択で閉じる。
 */
export function DateField({ value, onChange, id, placeholder = '予定日を選択', className = '' }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selected = parseYMD(value);
  const defaults = getDefaultClassNames();

  // クリック外 + ESC で閉じる
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    document.addEventListener('touchstart', handleDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      document.removeEventListener('touchstart', handleDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleSelect = (d: Date | undefined) => {
    onChange(d ? formatYMD(d) : '');
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* 表示トリガー: button に id を付与して <label htmlFor> と関連付け
         （button は form-associated labellable control） */}
      <div className="flex items-stretch gap-2">
        <button
          id={id}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="flex-1 rounded-lg bg-soil-surface border border-border px-3 py-2 text-sm text-left flex items-center justify-between gap-2 hover:border-moss-light/60 transition-colors"
        >
          <span className="flex items-center gap-2 min-w-0">
            <CalendarIcon size={16} className="text-moss-light shrink-0" aria-hidden="true" />
            <span className={selected ? 'text-washi-cream truncate' : 'text-washi-dim truncate'}>
              {selected ? formatButtonLabel(selected) : placeholder}
            </span>
          </span>
        </button>
        {selected && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="予定日をクリア"
            className="rounded-lg bg-soil-surface border border-border px-2 text-washi-dim hover:text-washi-cream hover:border-moss-light/60 transition-colors"
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Popover */}
      {open && (
        <div
          role="dialog"
          className="absolute z-50 mt-1 left-0 rounded-lg border border-moss-light/40 bg-soil-elevated shadow-lg p-3 animate-fade-in"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ja}
            showOutsideDays
            classNames={{
              // root の CSS 変数は globals.css の .rdp-root で moss 系に上書き済み
              root: `${defaults.root} text-washi-cream`,
              month_caption: `${defaults.month_caption} serif-display text-sm font-bold text-washi-cream`,
              caption_label: `${defaults.caption_label} text-washi-cream`,
              nav: `${defaults.nav} text-moss-light`,
              weekday: `${defaults.weekday} mono-data text-[10px] uppercase tracking-wider text-washi-dim font-normal`,
              day: `${defaults.day} text-sm`,
              day_button: `${defaults.day_button} rounded-md hover:bg-moss-primary/20 text-washi-muted`,
              today: `${defaults.today} font-bold [&>button]:text-moss-light`,
              selected: `${defaults.selected} [&>button]:bg-moss-primary [&>button]:text-washi-cream [&>button]:hover:bg-moss-light [&>button]:border [&>button]:border-moss-light`,
              outside: `${defaults.outside} text-washi-dim/40`,
              disabled: `${defaults.disabled} opacity-30`,
            }}
          />
        </div>
      )}
    </div>
  );
}
