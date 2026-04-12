import type { LucideIcon } from 'lucide-react';
import type { ReactNode, MouseEventHandler } from 'react';

interface ChipTagProps {
  /** Label text. */
  children: ReactNode;
  /** Optional lucide-react icon (rendered at size=11 on the left). */
  icon?: LucideIcon;
  /** Active/selected state — uses moss-primary background. */
  active?: boolean;
  /** If provided, the chip becomes a clickable <button>. */
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  /** Accessible aria-label, defaults to the children text if string. */
  ariaLabel?: string;
}

/**
 * DESIGN.md Common Pattern #5 — ChipTag.
 *
 * 短いメタ情報タグ・フィルターチップ。rounded-full + mono-data + soil-surface + border。
 *
 * @example
 * <ChipTag icon={MapPin}>広葉樹林</ChipTag>
 * <ChipTag active onClick={toggleFilter}>食用</ChipTag>
 */
export function ChipTag({
  children,
  icon: Icon,
  active = false,
  onClick,
  className = '',
  ariaLabel,
}: ChipTagProps) {
  const base =
    'inline-flex items-center gap-1 mono-data text-[11px] rounded-full px-2.5 py-1 transition-colors';
  const state = active
    ? 'bg-moss-primary text-washi-cream border border-moss-primary'
    : 'text-washi-muted bg-soil-surface border border-border';
  const interactive = onClick ? 'cursor-pointer hover:border-moss-light/50' : '';
  const classes = `${base} ${state} ${interactive} ${className}`;

  const content = (
    <>
      {Icon && (
        <Icon
          size={11}
          className={active ? 'text-washi-cream' : 'text-moss-light'}
          aria-hidden="true"
        />
      )}
      {children}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-label={ariaLabel} aria-pressed={active}>
        {content}
      </button>
    );
  }

  return (
    <span className={classes} aria-label={ariaLabel}>
      {content}
    </span>
  );
}
