'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ImageOff, ArrowRight } from 'lucide-react';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyCandidate } from '@/lib/identify-matcher-v2';

export interface SimpleIdentifyResultV2Props {
  candidates: readonly IdentifyCandidate[];
}

/**
 * 簡易識別の結果カードリスト (Phase 15 S4)。
 * 各候補: 写真 + 和名 + 学名 + 毒性バッジ + マッチ率バー + タップで図鑑詳細へ。
 */
export function SimpleIdentifyResultV2({ candidates }: SimpleIdentifyResultV2Props) {
  if (candidates.length === 0) {
    return (
      <p className="text-sm text-washi-muted text-center py-6">
        {UI_TEXT.identify.simpleNoResults}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {candidates.map((c, i) => (
        <li key={c.mushroom.id}>
          <CandidateCard candidate={c} rank={i + 1} />
        </li>
      ))}
    </ol>
  );
}

function CandidateCard({ candidate, rank }: { candidate: IdentifyCandidate; rank: number }) {
  const { mushroom, hitCount, selectedCount, score, monthMatched, isDangerous } = candidate;
  const pct = Math.round(score * 100);
  const heroSrc = mushroom.image_local || mushroom.images_remote[0] || null;

  return (
    <Link
      href={`/zukan/${mushroom.id}`}
      className={`group flex items-stretch gap-3 rounded-lg border p-3 transition-colors ${
        isDangerous
          ? 'bg-safety-deadly/[0.04] border-safety-deadly/40 hover:bg-safety-deadly/[0.08]'
          : 'bg-soil-surface border-border hover:bg-soil-elevated'
      }`}
    >
      {/* サムネイル */}
      <div className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-soil-elevated">
        {heroSrc ? (
          <Image src={heroSrc} alt={mushroom.names.ja} fill className="object-cover" sizes="64px" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-washi-dim">
            <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* 本体 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <span className="mono-data text-[10px] text-washi-dim">#{rank}</span>
              <h3 className="serif-display text-sm font-bold text-washi-cream truncate">
                {mushroom.names.ja}
              </h3>
              <ToxicityBadge safety={mushroom.safety} compact />
              {monthMatched && (
                <span
                  className="mono-data text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-moss-primary/20 text-moss-light border border-moss-light/30"
                  aria-label={UI_TEXT.identify.simpleMonthMatched}
                >
                  {UI_TEXT.identify.simpleMonthMatched}
                </span>
              )}
            </div>
            <ArrowRight
              size={14}
              aria-hidden="true"
              className="text-washi-dim shrink-0 mt-1 group-hover:text-moss-light group-hover:translate-x-0.5 transition-all"
            />
          </div>
          <p className="text-[11px] text-moss-light italic truncate">{mushroom.names.scientific}</p>
        </div>

        {/* スコアバー */}
        <ScoreBar pct={pct} hitCount={hitCount} selectedCount={selectedCount} isDangerous={isDangerous} />
      </div>
    </Link>
  );
}

function ScoreBar({
  pct,
  hitCount,
  selectedCount,
  isDangerous,
}: {
  pct: number;
  hitCount: number;
  selectedCount: number;
  isDangerous: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-soil-bg overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isDangerous ? 'bg-safety-deadly' : 'bg-moss-light'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="mono-data text-[10px] text-washi-muted shrink-0">
        {pct}%{selectedCount > 0 ? ` · ${hitCount}/${selectedCount}` : ''}
      </span>
    </div>
  );
}
