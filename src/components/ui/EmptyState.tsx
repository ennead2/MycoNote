import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  /** lucide-react icon component. Rendered at size=32 with washi-dim color. */
  icon: LucideIcon;
  /** Primary message shown below the icon. */
  message: ReactNode;
  /** Optional CTA rendered below the message (typically a <Button>). */
  cta?: ReactNode;
  className?: string;
}

/**
 * DESIGN.md Common Pattern #3 — EmptyState.
 *
 * 空のリスト・検索結果ゼロ・未登録時の表示。lucide アイコン + メッセージ + 任意 CTA。
 *
 * @example
 * <EmptyState
 *   icon={Inbox}
 *   message="まだ記録がありません"
 *   cta={<Button variant="primary" onClick={...}>最初の記録を追加</Button>}
 * />
 */
export function EmptyState({ icon: Icon, message, cta, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      <Icon size={32} className="text-washi-dim mb-3" aria-hidden="true" />
      <p className="text-washi-muted text-sm mb-4">{message}</p>
      {cta}
    </div>
  );
}
