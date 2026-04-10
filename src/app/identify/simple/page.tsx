// src/app/identify/simple/page.tsx
'use client';

import { useState, useRef } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { FeatureSelector } from '@/components/identify/FeatureSelector';
import { SimpleIdentifyResult } from '@/components/identify/SimpleIdentifyResult';
import { matchMushrooms } from '@/lib/identify-matcher';
import { compressImage, blobToDataUrl } from '@/lib/photo';
import { UI_TEXT } from '@/constants/ui-text';
import type { IdentifyInput, MatchResult } from '@/lib/identify-matcher';

const T = UI_TEXT.identify;

export default function SimpleIdentifyPage() {
  const [input, setInput] = useState<IdentifyInput>({});
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    const url = await blobToDataUrl(compressed);
    setPhotoUrl(url);
    e.target.value = '';
  };

  const handleSearch = () => {
    const currentMonth = new Date().getMonth() + 1;
    const matched = matchMushrooms(input, currentMonth);
    setResults(matched);
  };

  const handleRetry = () => {
    setResults(null);
  };

  const hasRequiredInput = !!(input.gill_type && input.cap_color && input.cap_shape && input.cap_size);

  return (
    <div className="min-h-screen bg-forest-950">
      <PageHeader title={results ? T.resultTitle : T.simpleTitle} showBack />

      {/* 結果表示 */}
      {results && (
        <div className="px-4 py-4">
          <SimpleIdentifyResult results={results} onRetry={handleRetry} />
        </div>
      )}

      {/* 入力フォーム */}
      {!results && (
        <div className="px-4 py-4 space-y-3">
          {/* 注意書き */}
          <div className="rounded-lg border-l-[3px] border-amber-500 bg-forest-900 p-3">
            <p className="text-xs text-amber-300">⚠ {T.simpleResultSafetyWarning}</p>
          </div>

          {/* 参考写真 */}
          <div className="rounded-lg bg-forest-900 border border-forest-700 overflow-hidden">
            {photoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={T.referencePhoto} className="w-full max-h-[240px] object-contain bg-black/20" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-2.5 bg-gradient-to-t from-black/50 to-transparent">
                  <span className="text-[10px] text-white/70">📷 {T.referencePhotoHint}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-black/50 border border-white/30 rounded-md text-[10px] text-white"
                  >
                    {T.changePhoto}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-[120px] flex flex-col items-center justify-center gap-2 text-forest-500 hover:text-forest-400"
              >
                <span className="text-2xl">📷</span>
                <span className="text-xs">{T.referencePhoto}（任意）</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          {/* 特徴選択 */}
          <FeatureSelector input={input} onChange={setInput} />

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={!hasRequiredInput}
            className="w-full py-3 bg-forest-500 text-white rounded-lg text-sm font-bold hover:bg-forest-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            🔍 {T.searchCandidates}
          </button>
        </div>
      )}
    </div>
  );
}
