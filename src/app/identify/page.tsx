'use client';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { UI_TEXT } from '@/constants/ui-text';

export default function IdentifyPage() {
  const router = useRouter();
  const { state } = useApp();
  const hasApiKey = !!state.apiKey;

  return (
    <div>
      <PageHeader title={UI_TEXT.identify.title} />
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-forest-400 leading-relaxed">{UI_TEXT.identify.selectPrompt}</p>

        {/* 詳細識別カード */}
        <button
          onClick={() => hasApiKey ? router.push('/identify/detail') : router.push('/settings')}
          className="w-full text-left rounded-xl bg-white/95 p-4 border-2 border-forest-500 transition-colors hover:border-forest-400"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center text-xl">
              🔬
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-forest-900">{UI_TEXT.identify.detailTitle}</div>
              <div className="text-xs text-gray-500">{UI_TEXT.identify.detailLabel}</div>
            </div>
            <span className="text-forest-600 text-lg">→</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-2">{UI_TEXT.identify.detailDescription}</p>
          <div className="flex gap-2">
            <span className="text-[10px] bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full">
              📡 {UI_TEXT.identify.requiresOnline}
            </span>
            <span className="text-[10px] bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full">
              🔑 {UI_TEXT.identify.requiresApiKey}
            </span>
          </div>
          {!hasApiKey && (
            <div className="mt-2 text-xs text-amber-600 font-medium">
              ⚠ {UI_TEXT.identify.setupApiKey} — {UI_TEXT.identify.goToSettings}
            </div>
          )}
        </button>

        {/* 簡易識別カード */}
        <button
          onClick={() => router.push('/identify/simple')}
          className="w-full text-left rounded-xl bg-white/95 p-4 border-2 border-forest-500 transition-colors hover:border-forest-400"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center text-xl">
              📷
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-forest-900">{UI_TEXT.identify.simpleTitle}</div>
              <div className="text-xs text-gray-500">{UI_TEXT.identify.simpleLabel}</div>
            </div>
            <span className="text-forest-600 text-lg">→</span>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed mb-2">{UI_TEXT.identify.simpleDescription}</p>
          <div className="flex gap-2">
            <span className="text-[10px] bg-forest-100 text-forest-700 px-2 py-0.5 rounded-full">
              📴 {UI_TEXT.identify.offlineAvailable}
            </span>
          </div>
        </button>

        {/* 注意書き */}
        <div className="rounded-lg border-l-[3px] border-amber-500 bg-forest-800 p-3">
          <p className="text-xs text-amber-300 leading-relaxed">⚠ {UI_TEXT.identify.safetyWarning}</p>
        </div>
      </div>
    </div>
  );
}
