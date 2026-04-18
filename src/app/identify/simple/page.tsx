'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { FeatureSelectorV2 } from '@/components/identify/FeatureSelectorV2';
import { MonthSelector } from '@/components/identify/MonthSelector';
import { SimpleIdentifyResultV2 } from '@/components/identify/SimpleIdentifyResultV2';
import { mushrooms } from '@/data/mushrooms';
import { matchSpeciesByTraits, hasDangerousCandidate } from '@/lib/identify-matcher-v2';
import { formatTraitLabel } from '@/lib/trait-labels';
import { UI_TEXT } from '@/constants/ui-text';

const T = UI_TEXT.identify;

/**
 * Phase 15 S4: 大菌輪統制形質ベースの簡易識別 UI。
 *
 * ユーザーフロー:
 *   1. 上部の FeatureSelectorV2 で観察できる特徴にチェック
 *   2. 選択された trait_keys を matchSpeciesByTraits に渡して候補算出
 *   3. 下部に SimpleIdentifyResultV2 で候補カードを表示
 *
 * オフラインで完全動作（mushrooms.json がバンドル済み）。
 */
export default function SimpleIdentifyPage() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [month, setMonth] = useState<number | undefined>(undefined);

  const handleToggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleClearAll = () => {
    setSelected(new Set());
    setMonth(undefined);
  };

  const candidates = useMemo(() => {
    return matchSpeciesByTraits([...selected], mushrooms, { maxResults: 20, month });
  }, [selected, month]);

  const showDangerWarning = hasDangerousCandidate(candidates);
  const selectedArr = [...selected];
  const hasAnyInput = selectedArr.length > 0 || month !== undefined;

  return (
    <div className="min-h-screen bg-soil-bg">
      <PageHeader title={T.simpleTitle} showBack />

      <div className="max-w-md mx-auto px-4 py-4 space-y-5">
        {/* イントロ */}
        <p className="text-sm text-washi-muted leading-relaxed">{T.simpleIntro}</p>

        {/* 選択済み chips */}
        <SelectedSummary
          selected={selectedArr}
          month={month}
          onRemove={handleToggle}
          onClearMonth={() => setMonth(undefined)}
          onClearAll={handleClearAll}
        />

        {/* 観察月 */}
        <MonthSelector value={month} onChange={setMonth} />

        {/* 特徴選択 */}
        <FeatureSelectorV2 selected={selected} onToggle={handleToggle} />

        {/* 結果セクション */}
        {hasAnyInput && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="serif-display text-base font-bold text-washi-cream">
                {T.simpleResultsHeading}
                {candidates.length > 0 && (
                  <span className="mono-data text-xs text-washi-dim ml-2">
                    {candidates.length}
                  </span>
                )}
              </h2>
            </div>

            {showDangerWarning && (
              <InfoBanner
                icon={AlertTriangle}
                severity="toxic"
                label={T.simpleDangerLabel}
                role="alert"
              >
                {T.simpleDangerWarning}
              </InfoBanner>
            )}

            <SimpleIdentifyResultV2 candidates={candidates} />
          </section>
        )}

        {/* 末尾: 帰属表示 + 安全警告 */}
        <p className="mono-data text-[10px] text-washi-dim text-center leading-relaxed">
          {T.simpleAttribution}
        </p>
        <p className="text-[11px] text-washi-muted text-center leading-relaxed">
          {T.simpleResultSafetyWarning}
        </p>
      </div>
    </div>
  );
}

function SelectedSummary({
  selected,
  month,
  onRemove,
  onClearMonth,
  onClearAll,
}: {
  selected: readonly string[];
  month: number | undefined;
  onRemove: (key: string) => void;
  onClearMonth: () => void;
  onClearAll: () => void;
}) {
  const totalCount = selected.length + (month !== undefined ? 1 : 0);
  if (totalCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-soil-surface/50 p-3 text-center">
        <p className="text-xs text-washi-dim">{UI_TEXT.identify.simpleNoSelection}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-moss-light/30 bg-soil-surface p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="mono-data text-[10px] uppercase tracking-wider text-washi-dim">
          {UI_TEXT.identify.simpleSelectedLabel} · {totalCount}
        </span>
        <button
          type="button"
          onClick={onClearAll}
          className="mono-data text-[10px] text-moss-light hover:text-washi-cream transition-colors"
        >
          {UI_TEXT.identify.simpleClearAll}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {month !== undefined && (
          <button
            type="button"
            onClick={onClearMonth}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-moss-light/15 text-washi-cream border border-moss-light/40 hover:bg-moss-light/25 transition-colors"
            aria-label={`${month}月 を削除`}
          >
            <span>{month}月</span>
            <X size={11} aria-hidden="true" />
          </button>
        )}
        {selected.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onRemove(key)}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] bg-moss-primary/20 text-washi-cream border border-moss-light/40 hover:bg-moss-primary/30 transition-colors"
            aria-label={`${formatTraitLabel(key)} を削除`}
          >
            <span>{formatTraitLabel(key)}</span>
            <X size={11} aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
