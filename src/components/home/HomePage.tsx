'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Search, Map, FileText, ShieldAlert } from 'lucide-react';
import { UI_TEXT } from '@/constants/ui-text';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { useRecords } from '@/contexts/RecordsContext';
import { mushrooms, getMushroomById } from '@/data/mushrooms';
import { getSeasonalMushrooms, getSafetyTip, dateToSeed } from '@/lib/season-utils';
import type { Mushroom } from '@/types/mushroom';

const QUICK_ACTIONS = [
  { href: '/zukan', label: UI_TEXT.home.quickZukan, Icon: BookOpen, desc: `${mushrooms.length} ${UI_TEXT.home.speciesCount}` },
  { href: '/identify', label: UI_TEXT.home.quickIdentify, Icon: Search, desc: 'AI・特徴' },
  { href: '/plan', label: UI_TEXT.home.quickPlan, Icon: Map, desc: 'AI チャット' },
  { href: '/records', label: UI_TEXT.home.quickRecords, Icon: FileText, desc: 'GPS・写真' },
] as const;

export default function HomePage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(1);
  const [safetyTip, setSafetyTip] = useState<string>('');
  const { records } = useRecords();

  useEffect(() => {
    const now = new Date();
    setCurrentMonth(now.getMonth() + 1);
    setSafetyTip(getSafetyTip(dateToSeed(now)));
    setIsHydrated(true);
  }, []);

  const seasonalMushrooms: Mushroom[] = isHydrated ? getSeasonalMushrooms(currentMonth, 12) : [];
  const recentRecords = records.slice(0, 3);

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Hero */}
      <section className="px-4 pt-8 pb-6 text-center">
        <h1 className="serif-display text-3xl font-bold text-washi-cream tracking-wide">
          {UI_TEXT.home.title}
        </h1>
        <p className="text-washi-muted text-sm mt-2">{UI_TEXT.home.subtitle}</p>
      </section>

      {/* Quick Access */}
      <section className="px-3 pb-6">
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(({ href, label, Icon, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 bg-soil-surface border border-border rounded-lg p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-moss-light/40 hover:bg-soil-elevated active:translate-y-0"
            >
              <Icon size={22} className="text-moss-light shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-washi-cream font-medium text-sm">{label}</p>
                <p className="text-washi-muted text-[11px] mono-data">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Seasonal mushrooms */}
      <section className="px-3 pb-6">
        <header className="flex items-end justify-between mb-3 px-1">
          <h2 className="serif-display text-base text-washi-cream">
            <span className="mono-data text-moss-light text-xs mr-2">
              {isHydrated ? `${currentMonth}月` : ''}
            </span>
            {UI_TEXT.home.seasonalTitle}
          </h2>
          <Link
            href="/zukan"
            className="text-washi-muted hover:text-moss-light text-[11px] mono-data transition-colors"
          >
            {UI_TEXT.home.viewAll} →
          </Link>
        </header>

        {!isHydrated ? (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-32 aspect-[3/4] rounded-lg bg-soil-surface animate-shimmer" />
            ))}
          </div>
        ) : seasonalMushrooms.length === 0 ? (
          <p className="text-washi-muted text-sm text-center py-6">{UI_TEXT.home.noSeasonal}</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide snap-x snap-mandatory">
            {seasonalMushrooms.map((m) => (
              <SeasonalCard key={m.id} mushroom={m} />
            ))}
          </div>
        )}
      </section>

      {/* Safety Tip */}
      {isHydrated && (
        <section className="px-3 pb-6">
          <div
            role="note"
            className="bg-soil-surface border border-safety-caution/50 rounded-lg p-3.5 flex gap-3 items-start"
          >
            <ShieldAlert
              size={20}
              className="text-safety-caution shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="mono-data text-safety-caution font-bold text-[10px] tracking-wider mb-1">
                {UI_TEXT.home.safetyTip}
              </p>
              <p className="text-washi-cream text-sm leading-relaxed">{safetyTip}</p>
            </div>
          </div>
        </section>
      )}

      {/* Recent records */}
      {isHydrated && recentRecords.length > 0 && (
        <section className="px-3 pb-6">
          <header className="flex items-end justify-between mb-3 px-1">
            <h2 className="serif-display text-base text-washi-cream">
              {UI_TEXT.home.recentRecords}
            </h2>
            <Link
              href="/records"
              className="text-washi-muted hover:text-moss-light text-[11px] mono-data transition-colors"
            >
              {UI_TEXT.home.viewAll} →
            </Link>
          </header>
          <div className="space-y-2">
            {recentRecords.map((r) => {
              const mushroom = r.mushroom_id ? getMushroomById(r.mushroom_id) : undefined;
              const name = mushroom?.names.ja ?? r.mushroom_name_ja ?? '不明';
              return (
                <Link
                  key={r.id}
                  href={`/records/detail?id=${r.id}`}
                  className="flex items-center gap-3 bg-soil-surface border border-border rounded-lg p-3 hover:border-moss-light/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="serif-display text-sm text-washi-cream truncate">{name}</p>
                    <p className="text-[11px] text-washi-muted mono-data mt-0.5">
                      {new Date(r.observed_at).toLocaleDateString('ja-JP')}
                      {r.location?.description && (
                        <span className="ml-2 text-washi-dim">· {r.location.description}</span>
                      )}
                    </p>
                  </div>
                  {mushroom && <ToxicityBadge toxicity={mushroom.toxicity} compact />}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SeasonalCard({ mushroom }: { mushroom: Mushroom }) {
  return (
    <Link
      href={`/zukan/${mushroom.id}`}
      className="group shrink-0 w-32 snap-start bg-soil-surface border border-border rounded-lg overflow-hidden transition-all duration-200 hover:border-moss-light/40 hover:-translate-y-0.5"
    >
      <div className="relative aspect-square bg-soil-elevated">
        <Image
          src={mushroom.image_local}
          alt={mushroom.names.ja}
          fill
          sizes="128px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
      </div>
      <div className="p-2 flex flex-col gap-1">
        <p className="serif-display text-washi-cream font-medium text-xs leading-tight truncate">
          {mushroom.names.ja}
        </p>
        <ToxicityBadge toxicity={mushroom.toxicity} compact />
      </div>
    </Link>
  );
}
