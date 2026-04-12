// src/components/identify/SimpleIdentifyResult.tsx
'use client';

import { useRouter } from 'next/navigation';
import { UI_TEXT } from '@/constants/ui-text';
import { TOXICITY_CONFIG } from '@/constants/toxicity';
import type { MatchResult } from '@/lib/identify-matcher';

interface SimpleIdentifyResultProps {
  results: MatchResult[];
  onRetry: () => void;
}

const toxicityBadge: Record<string, { bg: string; text: string }> = {
  edible: { bg: 'bg-green-600', text: 'text-white' },
  edible_caution: { bg: 'bg-yellow-600', text: 'text-white' },
  inedible: { bg: 'bg-gray-500', text: 'text-white' },
  toxic: { bg: 'bg-red-600', text: 'text-white' },
  deadly_toxic: { bg: 'bg-red-700', text: 'text-white' },
};

const T = UI_TEXT.identify;

const TRAIT_LABELS: Record<string, string> = {
  gill_type: T.gillType,
  cap_color: T.capColor,
  cap_shape: T.capShape,
  cap_size: T.capSize,
  gill_attachment: T.gillAttachment,
  stalk_color: T.stalkColor,
  stalk_features: T.stalkFeatures,
  bruising: T.bruising,
  substrate: T.substrateLabel,
};

export function SimpleIdentifyResult({ results, onRetry }: SimpleIdentifyResultProps) {
  const router = useRouter();
  const isToxic = (t: string) => t === 'toxic' || t === 'deadly_toxic';

  return (
    <div className="space-y-3">
      {/* 注意書き */}
      <div className="rounded-lg border-l-[3px] border-amber-500 bg-soil-surface p-3">
        <p className="text-xs text-amber-300">⚠ {T.simpleResultSafetyWarning}</p>
      </div>

      {/* 候補一覧 */}
      {results.map((result) => {
        const m = result.mushroom;
        const toxic = isToxic(m.toxicity);
        const badge = toxicityBadge[m.toxicity];
        const toxicityLabel = TOXICITY_CONFIG[m.toxicity].label;
        return (
          <button
            key={m.id}
            onClick={() => router.push(`/zukan/${m.id}`)}
            className={`w-full text-left rounded-lg p-2.5 ${
              toxic
                ? 'bg-red-950/50 border border-red-800'
                : 'bg-soil-surface border border-border'
            }`}
          >
            <div className="flex gap-2.5">
              {/* サムネイル */}
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.image_local}
                  alt={m.names.ja}
                  className="w-14 h-14 object-cover rounded-md"
                />
                {toxic && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white">⚠</div>
                )}
              </div>
              {/* 情報 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-sm ${toxic ? 'text-red-200' : 'text-washi-cream'}`}>
                    {m.names.ja}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                    {toxicityLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={`flex-1 h-1.5 rounded-full ${toxic ? 'bg-red-900' : 'bg-soil-surface'}`}>
                    <div
                      className={`h-1.5 rounded-full ${toxic ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                  <span className={`text-[10px] ${toxic ? 'text-red-300' : 'text-moss-light'}`}>{result.score}%</span>
                </div>
                {result.matchedTraits.length > 0 && (
                  <div className={`text-[9px] ${toxic ? 'text-red-400' : 'text-washi-dim'}`}>
                    {result.isToxicWarning && '⚠ '}
                    {T.matched}: {result.matchedTraits.map((t) => TRAIT_LABELS[t] ?? t).join('・')}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={onRetry}
          className="flex-1 py-2.5 bg-soil-surface border border-border rounded-lg text-xs text-moss-light hover:border-washi-dim"
        >
          🔄 {T.changeConditions}
        </button>
        <button
          onClick={() => router.push('/identify/detail')}
          className="flex-1 py-2.5 bg-soil-surface border border-border rounded-lg text-xs text-moss-light hover:border-washi-dim"
        >
          🔬 {T.goToDetailIdentify}
        </button>
      </div>
    </div>
  );
}
