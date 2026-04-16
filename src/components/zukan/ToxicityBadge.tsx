import { SAFETY_CONFIG } from '@/constants/safety';
import type { Safety } from '@/types/mushroom';

interface ToxicityBadgeProps {
  safety: Safety;
  compact?: boolean;
}

export function ToxicityBadge({ safety, compact = false }: ToxicityBadgeProps) {
  const config = SAFETY_CONFIG[safety];
  const isDangerous = safety === 'toxic' || safety === 'deadly';

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white tracking-wide ${config.color}`}
      >
        <span aria-hidden="true">{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold text-white tracking-wide ${config.color} ${isDangerous ? 'text-sm' : 'text-xs'}`}
      role="status"
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
