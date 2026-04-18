'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Search, Sparkles } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InfoBanner } from '@/components/ui/InfoBanner';
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
    <div className="min-h-screen bg-soil-bg">
      <PageHeader title={result ? UI_TEXT.identify.resultTitle : UI_TEXT.identify.detailTitle} showBack />

      <div className="px-4 py-4 space-y-4">
        {!result && (
          <InfoBanner
            icon={AlertTriangle}
            severity="caution"
            label={UI_TEXT.common.cautionLabel}
          >
            {UI_TEXT.identify.resultSafetyWarning}
          </InfoBanner>
        )}

        {result && <IdentifyResultView result={result} onRetry={handleRetry} />}

        {error && (
          <InfoBanner icon={AlertTriangle} severity="toxic" label={UI_TEXT.common.error} role="alert">
            <span className="block mb-2">{error}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleIdentify}
              className="text-safety-toxic border-safety-toxic/50 hover:bg-safety-toxic/10"
            >
              {UI_TEXT.common.retry}
            </Button>
          </InfoBanner>
        )}

        {!result && !isLoading && (
          <>
            <section className="rounded-lg border border-border bg-soil-surface p-4">
              <h2 className="text-xs font-bold text-moss-light mb-3">
                {UI_TEXT.identify.addPhoto}
              </h2>
              <PhotoUploader images={images} onImagesChange={setImages} />
            </section>

            <Button
              variant="primary"
              size="lg"
              onClick={handleIdentify}
              disabled={images.length === 0}
              className="w-full inline-flex items-center justify-center gap-2"
            >
              <Search size={16} strokeWidth={2.5} aria-hidden="true" />
              <span>{UI_TEXT.identify.startIdentify}</span>
            </Button>
          </>
        )}

        {isLoading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="relative">
              <LoadingSpinner />
              <Sparkles
                size={14}
                className="absolute -top-1 -right-2 text-moss-light animate-pulse"
                aria-hidden="true"
              />
            </div>
            <p className="text-sm text-washi-dim mono-data tracking-wide">
              {UI_TEXT.identify.identifying}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
