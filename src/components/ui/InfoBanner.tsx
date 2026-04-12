import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Severity = 'info' | 'caution' | 'toxic' | 'deadly';

interface InfoBannerProps {
  /** Severity controls border + icon + label color. Default 'caution'. */
  severity?: Severity;
  /** lucide-react icon component. Rendered at size=20 on the left. */
  icon: LucideIcon;
  /** Short uppercase label above the message (mono-data, tracking-wider). */
  label: string;
  /** Main message content. */
  children: ReactNode;
  className?: string;
  role?: 'note' | 'alert' | 'status';
}

/** Severity → color token (both Tailwind border class and text class). */
const SEVERITY: Record<Severity, { border: string; text: string }> = {
  info: { border: 'border-safety-edible/50', text: 'text-safety-edible' },
  caution: { border: 'border-safety-caution/50', text: 'text-safety-caution' },
  toxic: { border: 'border-safety-toxic/50', text: 'text-safety-toxic' },
  deadly: { border: 'border-safety-deadly/50', text: 'text-safety-deadly' },
};

/**
 * DESIGN.md Common Pattern #4 — InfoBanner.
 *
 * 安全 Tips・注意喚起・情報バナー。safety-* パレットで重要度を表現。
 *
 * @example
 * <InfoBanner icon={ShieldAlert} severity="caution" label="安全のヒント">
 *   同定が難しい種は食べない。疑わしきは捨てる。
 * </InfoBanner>
 */
export function InfoBanner({
  severity = 'caution',
  icon: Icon,
  label,
  children,
  className = '',
  role = 'note',
}: InfoBannerProps) {
  const sev = SEVERITY[severity];
  return (
    <div
      role={role}
      className={`bg-soil-surface border ${sev.border} rounded-lg p-3.5 flex gap-3 items-start ${className}`}
    >
      <Icon size={20} className={`${sev.text} shrink-0 mt-0.5`} aria-hidden="true" />
      <div className="min-w-0">
        <p className={`mono-data ${sev.text} font-bold text-[10px] tracking-wider mb-1`}>
          {label}
        </p>
        <p className="text-washi-cream text-sm leading-relaxed">{children}</p>
      </div>
    </div>
  );
}
