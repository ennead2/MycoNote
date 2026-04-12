// src/app/identify/simple/page.tsx
'use client';

import { useState, useRef } from 'react';
import { Camera, ImagePlus, Search } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
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
    <div className="min-h-screen bg-soil-bg">
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
          <div className="rounded-lg border-l-[3px] border-amber-500 bg-soil-surface p-3">
            <p className="text-xs text-amber-300">⚠ {T.simpleResultSafetyWarning}</p>
          </div>

          {/* 参考写真 */}
          <div className="rounded-lg bg-soil-surface border border-border overflow-hidden">
            {photoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={T.referencePhoto} className="w-full max-h-[240px] object-contain bg-black/20" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-[10px] text-washi-cream/80 flex items-center gap-1">
                    <Camera size={11} aria-hidden="true" />
                    {T.referencePhotoHint}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-soil-bg/70 border border-washi-cream/30 rounded-md text-[10px] text-washi-cream hover:border-moss-light"
                    >
                      <Camera size={11} aria-hidden="true" />
                      {T.takePhoto}
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-soil-bg/70 border border-washi-cream/30 rounded-md text-[10px] text-washi-cream hover:border-moss-light"
                    >
                      <ImagePlus size={11} aria-hidden="true" />
                      {T.chooseFile}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-6 px-4">
                <p className="text-xs text-washi-dim">{T.referencePhoto}（任意）</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-bg px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
                  >
                    <Camera size={16} aria-hidden="true" />
                    {T.takePhoto}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-bg px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
                  >
                    <ImagePlus size={16} aria-hidden="true" />
                    {T.chooseFile}
                  </button>
                </div>
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePhotoChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </div>

          {/* 特徴選択 */}
          <FeatureSelector input={input} onChange={setInput} />

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={!hasRequiredInput}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-moss-primary text-washi-cream rounded-lg text-sm font-bold hover:bg-moss-light disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Search size={16} strokeWidth={2.5} aria-hidden="true" />
            {T.searchCandidates}
          </button>
        </div>
      )}
    </div>
  );
}
