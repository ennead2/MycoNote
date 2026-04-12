// src/components/identify/IdentifyResult.tsx
'use client';

import { useRouter } from 'next/navigation';
import { UI_TEXT } from '@/constants/ui-text';
import { Button } from '@/components/ui/Button';
import type { IdentifyResult, IdentifyCandidate } from '@/types/chat';

const confidenceStyles: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-green-600', text: 'text-white', label: UI_TEXT.identify.confidenceHigh },
  medium: { bg: 'bg-orange-500', text: 'text-white', label: UI_TEXT.identify.confidenceMedium },
  low: { bg: 'bg-red-500', text: 'text-white', label: UI_TEXT.identify.confidenceLow },
};

function CandidateCard({ candidate }: { candidate: IdentifyCandidate }) {
  const router = useRouter();
  const style = confidenceStyles[candidate.confidence];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-sm text-soil-surface">{candidate.name_ja}</span>
        <span className={`${style.bg} ${style.text} px-2 py-0.5 rounded-full text-[10px] font-medium`}>
          {style.label}
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-relaxed">{candidate.reason}</p>
      {candidate.id && (
        <button
          onClick={() => router.push(`/zukan/${candidate.id}`)}
          className="mt-2 text-xs text-moss-primary underline hover:text-washi-dim"
        >
          📖 {UI_TEXT.identify.viewInZukan}
        </button>
      )}
    </div>
  );
}

interface IdentifyResultViewProps {
  result: IdentifyResult;
  onRetry: () => void;
}

export function IdentifyResultView({ result, onRetry }: IdentifyResultViewProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg border-l-[3px] border-amber-400 bg-amber-50 p-3">
        <p className="text-xs text-amber-800">⚠ {UI_TEXT.identify.resultSafetyWarning}</p>
      </div>

      <div className="space-y-2">
        {result.candidates.map((candidate, i) => (
          <CandidateCard key={i} candidate={candidate} />
        ))}
      </div>

      {result.similar_toxic.length > 0 && (
        <div className="rounded-lg border-l-[3px] border-red-400 bg-red-50 p-3">
          <h3 className="text-xs font-bold text-red-800 mb-1">⚠ {UI_TEXT.identify.similarToxicWarning}</h3>
          {result.similar_toxic.map((text, i) => (
            <p key={i} className="text-xs text-red-700">{text}</p>
          ))}
        </div>
      )}

      {result.cautions.length > 0 && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <ul className="space-y-1">
            {result.cautions.map((caution, i) => (
              <li key={i} className="text-xs text-gray-600">• {caution}</li>
            ))}
          </ul>
        </div>
      )}

      <Button variant="secondary" size="md" onClick={onRetry} className="w-full bg-white text-border border-moss-light">
        {UI_TEXT.identify.retryIdentify}
      </Button>
    </div>
  );
}
