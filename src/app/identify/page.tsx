'use client';
import { useRouter } from 'next/navigation';
import { Sparkles, SlidersHorizontal, ShieldAlert, ArrowRight, Wifi, Key, WifiOff } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { UI_TEXT } from '@/constants/ui-text';

export default function IdentifyPage() {
  const router = useRouter();
  const { state } = useApp();
  // Gate apiKey-dependent rendering on isHydrated to prevent SSR/client mismatch:
  // localStorage reads produce different values on server (none) vs client (possibly present).
  const hasApiKey = state.isHydrated && !!state.apiKey;

  return (
    <div>
      <PageHeader title={UI_TEXT.identify.title} />
      <div className="px-4 py-4 space-y-4">
        <p className="text-sm text-washi-muted leading-relaxed">{UI_TEXT.identify.selectPrompt}</p>

        {/* 詳細識別（AI）— primary recommendation */}
        <button
          onClick={() => (hasApiKey ? router.push('/identify/detail') : router.push('/settings'))}
          className="group w-full text-left rounded-xl p-5 border transition-all duration-200 hover:-translate-y-0.5 bg-gradient-to-br from-moss-primary/25 via-soil-elevated to-soil-surface border-moss-light/40 hover:border-moss-light"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-lg bg-moss-primary/30 flex items-center justify-center text-moss-light shrink-0">
              <Sparkles size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="serif-display font-bold text-base text-washi-cream">
                {UI_TEXT.identify.detailTitle}
              </div>
              <div className="text-xs text-moss-light mono-data tracking-wide mt-0.5">
                {UI_TEXT.identify.detailLabel}
              </div>
            </div>
            <ArrowRight
              size={18}
              className="text-moss-light opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-washi-cream/85 leading-relaxed mb-3">
            {UI_TEXT.identify.detailDescription}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <Tag icon={<Wifi size={10} />} label={UI_TEXT.identify.requiresOnline} />
            <Tag icon={<Key size={10} />} label={UI_TEXT.identify.requiresApiKey} />
          </div>
          {/* Only render apiKey-dependent warning after hydration to avoid SSR mismatch */}
          {state.isHydrated && !state.apiKey && (
            <div className="mt-3 text-xs text-safety-caution mono-data flex items-center gap-1.5">
              <ShieldAlert size={12} aria-hidden="true" />
              {UI_TEXT.identify.setupApiKey} — {UI_TEXT.identify.goToSettings}
            </div>
          )}
        </button>

        {/* 簡易識別 — offline/field utility */}
        <button
          onClick={() => router.push('/identify/simple')}
          className="group w-full text-left rounded-xl p-5 border transition-all duration-200 hover:-translate-y-0.5 bg-soil-surface border-border hover:border-moss-primary/50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-lg bg-soil-elevated border border-border flex items-center justify-center text-moss-light shrink-0">
              <SlidersHorizontal size={22} strokeWidth={2} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="serif-display font-bold text-base text-washi-cream">
                {UI_TEXT.identify.simpleTitle}
              </div>
              <div className="text-xs text-washi-muted mono-data tracking-wide mt-0.5">
                {UI_TEXT.identify.simpleLabel}
              </div>
            </div>
            <ArrowRight
              size={18}
              className="text-washi-muted opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0"
              aria-hidden="true"
            />
          </div>
          <p className="text-xs text-washi-cream/85 leading-relaxed mb-3">
            {UI_TEXT.identify.simpleDescription}
          </p>
          <div className="flex gap-1.5 flex-wrap">
            <Tag icon={<WifiOff size={10} />} label={UI_TEXT.identify.offlineAvailable} />
          </div>
        </button>

        {/* 注意書き */}
        <div className="rounded-lg border border-safety-caution/40 bg-soil-surface p-3 flex gap-2 items-start">
          <ShieldAlert
            size={16}
            className="text-safety-caution shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-washi-cream leading-relaxed">{UI_TEXT.identify.safetyWarning}</p>
        </div>
      </div>
    </div>
  );
}

function Tag({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] bg-soil-bg border border-border text-washi-muted px-2 py-0.5 rounded-full mono-data">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
