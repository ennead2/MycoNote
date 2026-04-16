'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useApp } from '@/contexts/AppContext';
import { identifyMushroom } from '@/lib/claude';
import { mushrooms } from '@/data/mushrooms';
import { PhotoUploader } from '@/components/identify/PhotoUploader';
import { IdentifyResultView } from '@/components/identify/IdentifyResult';
import { UI_TEXT } from '@/constants/ui-text';
import type { Base64Image, IdentifyResult, CompactMushroom } from '@/types/chat';

const compactList: CompactMushroom[] = mushrooms.map((m) => ({
  id: m.id,
  name_ja: m.names.ja,
  scientific: m.names.scientific,
  safety: m.safety,
}));

export default function IdentifyDetailPage() {
  const router = useRouter();
  const { state } = useApp();
  const [images, setImages] = useState<Base64Image[]>([]);
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.isHydrated && !state.apiKey) {
      router.replace('/settings');
    }
  }, [state.isHydrated, state.apiKey, router]);

  if (!state.isHydrated || !state.apiKey) {
    return null;
  }

  const handleIdentify = async () => {
    if (images.length === 0) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const identifyResult = await identifyMushroom({
        apiKey: state.apiKey!,
        images,
        mushroomList: compactList,
      });
      setResult(identifyResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : UI_TEXT.common.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setImages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title={result ? UI_TEXT.identify.resultTitle : UI_TEXT.identify.detailTitle} showBack />

      <div className="px-4 py-4 space-y-4">
        {!result && (
          <div className="rounded-lg border-l-[3px] border-amber-400 bg-amber-50 p-3">
            <p className="text-xs text-amber-800">⚠ {UI_TEXT.identify.resultSafetyWarning}</p>
          </div>
        )}

        {result && <IdentifyResultView result={result} onRetry={handleRetry} />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700 mb-2">{error}</p>
            <Button variant="secondary" size="sm" onClick={handleIdentify} className="bg-white text-red-600 border-red-200">
              {UI_TEXT.common.retry}
            </Button>
          </div>
        )}

        {!result && !isLoading && (
          <>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-xs font-bold text-border mb-3">
                {UI_TEXT.identify.addPhoto}
              </h2>
              <PhotoUploader images={images} onImagesChange={setImages} />
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleIdentify}
              disabled={images.length === 0}
              className="w-full"
            >
              🔍 {UI_TEXT.identify.startIdentify}
            </Button>
          </>
        )}

        {isLoading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <LoadingSpinner />
            <p className="text-sm text-gray-500">{UI_TEXT.identify.identifying}</p>
          </div>
        )}
      </div>
    </div>
  );
}
