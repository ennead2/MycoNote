// src/components/identify/IdentifyResult.tsx
'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Skull, BookOpen, ShieldAlert, RefreshCcw, ArrowRight } from 'lucide-react';
import { UI_TEXT } from '@/constants/ui-text';
import { Button } from '@/components/ui/Button';
import { InfoBanner } from '@/components/ui/InfoBanner';
import type { IdentifyResult, IdentifyCandidate } from '@/types/chat';

/**
 * 確信度 → DESIGN.md の safety パレットにマッピング。
 *   high   → safety-edible (緑)
 *   medium → safety-caution (黄)
 *   low    → safety-toxic (橙赤)
 */
const confidenceStyles: Record<IdentifyCandidate['confidence'], { bg: string; label: string }> = {
  high: { bg: 'bg-safety-edible', label: UI_TEXT.identify.confidenceHigh },
  medium: { bg: 'bg-safety-caution', label: UI_TEXT.identify.confidenceMedium },
  low: { bg: 'bg-safety-toxic', label: UI_TEXT.identify.confidenceLow },
};

function CandidateCard({ candidate }: { candidate: IdentifyCandidate }) {
  const router = useRouter();
  const style = confidenceStyles[candidate.confidence];

  return (
    <article className="rounded-lg border border-border bg-soil-surface p-3">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <h3 className="serif-display font-bold text-sm text-washi-cream truncate">
          {candidate.name_ja}
        </h3>
        <span
          className={`${style.bg} text-white px-2 py-0.5 rounded-full mono-data text-[10px] font-bold tracking-wide shrink-0`}
        >
          {style.label}
        </span>
      </div>
      <p className="text-xs text-washi-muted leading-relaxed">{candidate.reason}</p>
      {candidate.id && (
        <button
          type="button"
          onClick={() => router.push(`/zukan/${candidate.id}`)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-moss-light hover:text-washi-cream transition-colors"
        >
          <BookOpen size={12} aria-hidden="true" />
          <span>{UI_TEXT.identify.viewInZukan}</span>
          <ArrowRight size={11} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}

interface IdentifyResultViewProps {
  result: IdentifyResult;
  onRetry: () => void;
}

export function IdentifyResultView({ result, onRetry }: IdentifyResultViewProps) {
  return (
    <div className="space-y-3">
      <InfoBanner icon={AlertTriangle} severity="caution" label={UI_TEXT.common.cautionLabel}>
        {UI_TEXT.identify.resultSafetyWarning}
      </InfoBanner>

      <div className="space-y-2">
        {result.candidates.map((candidate, i) => (
          <CandidateCard key={i} candidate={candidate} />
        ))}
      </div>

      {result.similar_toxic.length > 0 && (
        <InfoBanner
          icon={Skull}
          severity="toxic"
          label={UI_TEXT.identify.similarToxicWarning}
          role="alert"
        >
          <ul className="space-y-1">
            {result.similar_toxic.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </InfoBanner>
      )}

      {result.cautions.length > 0 && (
        <section className="rounded-lg border border-border bg-soil-surface p-3">
          <h3 className="mono-data text-[10px] uppercase tracking-wider text-washi-dim mb-1.5 flex items-center gap-1.5">
            <ShieldAlert size={12} aria-hidden="true" className="text-washi-dim" />
            <span>{UI_TEXT.identify.cautionsLabel}</span>
          </h3>
          <ul className="space-y-1">
            {result.cautions.map((caution, i) => (
              <li key={i} className="text-xs text-washi-muted leading-relaxed flex gap-1.5">
                <span aria-hidden="true" className="text-moss-light shrink-0">・</span>
                <span>{caution}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button
        variant="secondary"
        size="md"
        onClick={onRetry}
        className="w-full inline-flex items-center justify-center gap-2"
      >
        <RefreshCcw size={14} strokeWidth={2} aria-hidden="true" />
        <span>{UI_TEXT.identify.retryIdentify}</span>
      </Button>
    </div>
  );
}
