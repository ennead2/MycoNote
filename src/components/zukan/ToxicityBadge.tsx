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
      <span className={`inline-flex items-center shrink-0 rounded-full px-1 py-0 text-[10px] font-bold text-white ${config.color}`}>
        {config.label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold text-white ${config.color} ${isDangerous ? 'text-sm' : 'text-xs'}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
