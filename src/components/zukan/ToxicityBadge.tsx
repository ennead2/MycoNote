import { TOXICITY_CONFIG } from '@/constants/toxicity';
import type { Toxicity } from '@/types/mushroom';

interface ToxicityBadgeProps {
  toxicity: Toxicity;
  compact?: boolean;
}

export function ToxicityBadge({ toxicity, compact = false }: ToxicityBadgeProps) {
  const config = TOXICITY_CONFIG[toxicity];
  const isDangerous = toxicity === 'toxic' || toxicity === 'deadly_toxic';

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
