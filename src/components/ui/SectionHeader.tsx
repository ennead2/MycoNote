import Link from 'next/link';
import type { ReactNode } from 'react';

interface SectionHeaderProps {
  /** Main title text (rendered as h2 with serif-display). */
  title: ReactNode;
  /** Optional small label shown before the title (e.g. "4月", 件数). mono-data. */
  label?: ReactNode;
  /** Optional action shown at right, typically "すべて見る →". */
  action?: { href: string; text: string } | { onClick: () => void; text: string } | null;
  className?: string;
}

/**
 * DESIGN.md Common Pattern #2 — SectionHeader.
 *
 * セクションのタイトル行。左に見出し (serif-display)、右に任意のアクションリンク (mono-data)。
 *
 * @example
 * <SectionHeader title="今月の旬" label="4月" action={{ href: '/zukan', text: 'すべて見る' }} />
 */
export function SectionHeader({ title, label, action, className = '' }: SectionHeaderProps) {
  return (
    <header className={`flex items-end justify-between mb-3 px-1 ${className}`}>
      <h2 className="serif-display text-base text-washi-cream">
        {label && (
          <span className="mono-data text-moss-light text-xs mr-2">{label}</span>
        )}
        {title}
      </h2>
      {action && (
        'href' in action ? (
          <Link
            href={action.href}
            className="text-washi-muted hover:text-moss-light text-[11px] mono-data transition-colors"
          >
            {action.text} →
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="text-washi-muted hover:text-moss-light text-[11px] mono-data transition-colors"
          >
            {action.text} →
          </button>
        )
      )}
    </header>
  );
}
