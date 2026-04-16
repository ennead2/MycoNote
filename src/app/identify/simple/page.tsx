'use client';

import Link from 'next/link';
import { Construction, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { UI_TEXT } from '@/constants/ui-text';

const T = UI_TEXT.identify;

/**
 * Phase 13-F: 簡易識別は v2 データ移行に伴い一時停止中。
 * traits フィールドが v2 schema にないため特徴マッチングが動作しない。
 * Phase 14 で description / features から traits を Claude で構造化して再開予定。
 */
export default function SimpleIdentifyPage() {
  return (
    <div className="min-h-screen bg-soil-bg">
      <PageHeader title={T.simpleTitle} showBack />

      <div className="max-w-md mx-auto px-4 py-12 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-soil-surface flex items-center justify-center text-washi-dim">
            <Construction size={28} strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="serif-display text-xl font-bold text-washi-cream">{T.simpleSuspendedTitle}</h2>
            <p className="text-sm text-washi-muted leading-relaxed">{T.simpleSuspendedDescription}</p>
          </div>
        </div>

        <Link
          href="/identify/detail"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-moss-primary text-washi-cream px-4 py-3 text-sm font-bold hover:bg-moss-light transition-colors"
        >
          {T.simpleSuspendedCTA}
          <ArrowRight size={16} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
