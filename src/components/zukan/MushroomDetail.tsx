'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Bookmark, BookmarkCheck, Search, ArrowUpRight, AlertTriangle, ImageOff, ExternalLink, ChefHat, HeartPulse, type LucideIcon } from 'lucide-react';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { SeasonBar } from '@/components/zukan/SeasonBar';
import { ChipTag } from '@/components/ui/ChipTag';
import { InfoBanner } from '@/components/ui/InfoBanner';
import { getMushroomById } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import { renderColorText } from '@/lib/color-text';
import { useRecords } from '@/contexts/RecordsContext';
import { useBookmarks } from '@/contexts/BookmarksContext';
import type { Mushroom, SimilarSpecies } from '@/types/mushroom';

interface MushroomDetailProps {
  mushroom: Mushroom;
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-bold text-moss-light mb-2">{children}</h2>
);

export function MushroomDetail({ mushroom }: MushroomDetailProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // ヒーローが image_local 無しで images_remote[0] 流用のケース → ギャラリーから先頭をスキップして重複回避
  const heroFromRemote = !mushroom.image_local && mushroom.images_remote.length > 0;
  const heroSrc = mushroom.image_local || mushroom.images_remote[0] || null;
  const remoteCreditsAll = mushroom.images_remote_credits || mushroom.images_remote.map(() => '');
  const galleryPhotos = heroFromRemote ? mushroom.images_remote.slice(1) : mushroom.images_remote;
  const galleryCredits = heroFromRemote ? remoteCreditsAll.slice(1) : remoteCreditsAll;
  // Lightbox: [hero? + gallery] を連結（heroFromRemote のときは images_remote そのまま = hero + gallery）
  const allPhotos = [
    ...(heroSrc ? [heroSrc] : []),
    ...galleryPhotos,
  ];
  const allCredits = [
    ...(heroSrc ? [heroFromRemote ? remoteCreditsAll[0] ?? '' : ''] : []),
    ...galleryCredits,
  ];
  // 仕様上 v2 種は被り無し前提。SeasonBar は最初の range を表示。
  const primarySeason = mushroom.season[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
      {/* 1. Hero image */}
      <div
        className="w-full h-48 rounded-lg overflow-hidden bg-soil-surface flex items-center justify-center cursor-pointer"
        onClick={() => heroSrc && setLightboxIndex(0)}
      >
        {heroSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={heroSrc}
            alt={mushroom.names.ja}
            loading="eager"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <p className="text-washi-dim text-sm">画像なし</p>
        )}
      </div>

      {/* Additional photos from iNaturalist — 3-column grid */}
      {galleryPhotos.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-moss-light mb-2">{UI_TEXT.zukan.additionalPhotos}</h2>
          <div className="grid grid-cols-3 gap-2">
            {galleryPhotos.map((url, i) => (
              <RemotePhoto
                key={i}
                url={url}
                alt={`${mushroom.names.ja} - ${i + 1}`}
                credit={galleryCredits[i]}
                onClick={() => setLightboxIndex(i + (heroSrc ? 1 : 0))}
              />
            ))}
          </div>
        </div>
      )}

      {/* Google image search link */}
      <a
        href={`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(mushroom.names.ja + ' キノコ')}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-moss-light hover:text-washi-cream transition-colors"
      >
        <Search size={16} aria-hidden="true" />
        <span>{UI_TEXT.zukan.googleImageSearch}</span>
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>

      {/* Lightbox modal with swipe */}
      {lightboxIndex !== null && allPhotos.length > 0 && (
        <Lightbox
          photos={allPhotos}
          credits={allCredits}
          currentIndex={lightboxIndex}
          alt={mushroom.names.ja}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}

      {/* 2. Name + safety + Bookmark + scientific name + aliases */}
      <div>
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            <h1 className="serif-display text-2xl font-bold text-washi-cream">{mushroom.names.ja}</h1>
            <ToxicityBadge safety={mushroom.safety} />
          </div>
          <BookmarkToggle mushroomId={mushroom.id} />
        </div>
        <p className="text-sm text-moss-light italic">{mushroom.names.scientific}</p>
        {mushroom.names.scientific_synonyms && mushroom.names.scientific_synonyms.length > 0 && (
          <ScientificSynonymsList synonyms={mushroom.names.scientific_synonyms} />
        )}
        {mushroom.names.aliases && mushroom.names.aliases.length > 0 && (
          <p className="text-xs text-washi-dim mt-1">{mushroom.names.aliases.join('、')}</p>
        )}
      </div>

      {/* 3. Caution box (if caution exists) */}
      {mushroom.caution && (
        <InfoBanner
          icon={AlertTriangle}
          severity={mushroom.safety === 'deadly' ? 'deadly' : mushroom.safety === 'toxic' ? 'toxic' : 'caution'}
          label={UI_TEXT.zukan.cautionLabel}
          role="alert"
        >
          {renderColorText(mushroom.caution)}
        </InfoBanner>
      )}

      {/* 4. Description section */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.description}</SectionHeading>
        <p className="text-sm text-washi-muted leading-relaxed">{renderColorText(mushroom.description)}</p>
      </div>

      {/* 5. Features section */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.features}</SectionHeading>
        <p className="text-sm text-washi-muted leading-relaxed">{renderColorText(mushroom.features)}</p>
      </div>

      {/* 6. Season bar */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.season}</SectionHeading>
        <SeasonBar startMonth={primarySeason.start_month} endMonth={primarySeason.end_month} />
      </div>

      {/* 7. Habitat tags */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.habitat}</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {mushroom.habitat.map((h) => (
            <ChipTag key={h}>{h}</ChipTag>
          ))}
        </div>
      </div>

      {/* 8. Regions */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.regions}</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {mushroom.regions.map((r) => (
            <span key={r} className="text-xs text-moss-light">
              {r}
            </span>
          ))}
        </div>
      </div>

      {/* 9. Tree association (if exists) */}
      {mushroom.tree_association && mushroom.tree_association.length > 0 && (
        <div>
          <SectionHeading>{UI_TEXT.zukan.treeAssociation}</SectionHeading>
          <div className="flex flex-wrap gap-2">
            {mushroom.tree_association.map((t) => (
              <ChipTag key={t}>{t}</ChipTag>
            ))}
          </div>
        </div>
      )}

      {/* 10. Cooking & preservation (food-safe species only) */}
      {mushroom.cooking_preservation && (
        <HighlightSection icon={ChefHat} severity="edible" label={UI_TEXT.zukan.cooking}>
          {renderColorText(mushroom.cooking_preservation)}
        </HighlightSection>
      )}

      {/* 11. Poisoning first aid (toxic species only) */}
      {mushroom.poisoning_first_aid && (
        <HighlightSection icon={HeartPulse} severity="toxic" label={UI_TEXT.zukan.firstAid}>
          {renderColorText(mushroom.poisoning_first_aid)}
        </HighlightSection>
      )}

      {/* 12. Similar species */}
      {mushroom.similar_species.length > 0 && (
        <div>
          <SectionHeading>{UI_TEXT.zukan.similarSpecies}</SectionHeading>
          <div className="flex flex-col gap-3">
            {mushroom.similar_species.map((sim, i) => (
              <SimilarSpeciesCard key={`${sim.ja}-${i}`} sim={sim} />
            ))}
          </div>
        </div>
      )}

      {/* 13. Sources & licenses */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.sources}</SectionHeading>
        <ul className="space-y-1.5">
          {mushroom.sources.map((src, i) => (
            <li key={i} className="text-xs">
              <a
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-moss-light hover:text-washi-cream transition-colors"
              >
                <span>{src.name}</span>
                <ExternalLink size={11} aria-hidden="true" />
              </a>
              <span className="ml-2 mono-data text-[10px] text-washi-dim">{src.license}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 14. My records for this species */}
      <MyRecordsSection mushroomId={mushroom.id} />
    </div>
  );
}

/**
 * 学名のシノニム一覧。多すぎる場合は折り畳んで初期 3 件 + 「他 N 件」表示。
 * 5 件以下は全件展開のまま（折り畳み不要）。
 */
function ScientificSynonymsList({ synonyms }: { synonyms: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSE_THRESHOLD = 5;
  const INITIAL_VISIBLE = 3;
  const isLong = synonyms.length > COLLAPSE_THRESHOLD;
  const showAll = expanded || !isLong;
  const visible = showAll ? synonyms : synonyms.slice(0, INITIAL_VISIBLE);
  const hiddenCount = synonyms.length - INITIAL_VISIBLE;

  return (
    <p className="text-xs text-washi-dim italic mt-0.5">
      <span className="mono-data not-italic text-[10px] uppercase tracking-wider mr-1">syn.</span>
      {visible.join(', ')}
      {isLong && !showAll && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="ml-1 not-italic mono-data text-[10px] text-moss-light hover:text-washi-cream transition-colors"
        >
          …他 {hiddenCount} 件を表示
        </button>
      )}
      {isLong && showAll && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="ml-1 not-italic mono-data text-[10px] text-moss-light hover:text-washi-cream transition-colors"
        >
          閉じる
        </button>
      )}
    </p>
  );
}

/**
 * Phase 13-F Step 5: 中毒症状・調理など重要セクションを safety パレットの
 * カード型で強調表示。option B (rounded box + icon header)。
 */
function HighlightSection({
  icon: Icon,
  severity,
  label,
  children,
}: {
  icon: LucideIcon;
  severity: 'edible' | 'toxic' | 'caution';
  label: string;
  children: React.ReactNode;
}) {
  const palette = {
    edible: {
      border: 'border-safety-edible/40',
      bg: 'bg-safety-edible/[0.06]',
      icon: 'text-safety-edible',
    },
    toxic: {
      border: 'border-safety-toxic/40',
      bg: 'bg-safety-toxic/[0.06]',
      icon: 'text-safety-toxic',
    },
    caution: {
      border: 'border-safety-caution/40',
      bg: 'bg-safety-caution/[0.06]',
      icon: 'text-safety-caution',
    },
  }[severity];

  return (
    <section className={`rounded-lg border ${palette.border} ${palette.bg} p-4`}>
      <h2 className={`text-sm font-bold ${palette.icon} mb-2 flex items-center gap-2`}>
        <Icon size={16} strokeWidth={2} aria-hidden="true" />
        {label}
      </h2>
      <p className="text-sm text-washi-cream leading-relaxed">{children}</p>
    </section>
  );
}

function SimilarSpeciesCard({ sim }: { sim: SimilarSpecies }) {
  const linked = sim.id ? getMushroomById(sim.id) : undefined;

  if (!linked) {
    // Text-only — no link to a v2 species detail page.
    return (
      <div className="flex items-start gap-3 bg-soil-surface rounded-lg p-3">
        <div className="w-16 h-16 rounded-md flex items-center justify-center bg-soil-elevated text-washi-dim shrink-0">
          <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-bold text-washi-cream">{sim.ja}</span>
          {sim.scientific && (
            <span className="text-xs italic text-moss-light">{sim.scientific}</span>
          )}
          <span className="text-xs text-washi-muted leading-relaxed">{sim.note}</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/zukan/${linked.id}`}
      className="flex items-start gap-3 bg-soil-surface rounded-lg p-3 hover:bg-soil-elevated transition-colors"
    >
      <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-soil-elevated">
        {linked.image_local ? (
          <Image src={linked.image_local} alt={linked.names.ja} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-washi-dim">
            <ImageOff size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-sm font-bold text-washi-cream">{linked.names.ja}</span>
        <ToxicityBadge safety={linked.safety} compact />
        <span className="text-xs text-washi-muted leading-relaxed">{sim.note}</span>
      </div>
    </Link>
  );
}

function MyRecordsSection({ mushroomId }: { mushroomId: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <MyRecordsList mushroomId={mushroomId} />;
}

/**
 * Bookmark toggle for the detail page. Renders nothing until hydrated to avoid
 * SSR/CSR mismatch (bookmark state lives in IndexedDB, client-only).
 */
function BookmarkToggle({ mushroomId }: { mushroomId: string }) {
  const [mounted, setMounted] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div aria-hidden="true" className="w-9 h-9" />;
  }

  const active = isBookmarked(mushroomId);
  const Icon = active ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={() => void toggleBookmark(mushroomId)}
      aria-label={active ? UI_TEXT.zukan.bookmarkRemove : UI_TEXT.zukan.bookmarkAdd}
      aria-pressed={active}
      className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full transition-colors border ${
        active
          ? 'bg-moss-primary text-washi-cream border-moss-light'
          : 'bg-soil-surface text-washi-muted border-border hover:border-moss-light hover:text-moss-light'
      }`}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
    </button>
  );
}

function Lightbox({
  photos,
  credits,
  currentIndex,
  alt,
  onClose,
  onChangeIndex,
}: {
  photos: string[];
  credits: string[];
  currentIndex: number;
  alt: string;
  onClose: () => void;
  onChangeIndex: (i: number) => void;
}) {
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  const goPrev = () => onChangeIndex(Math.max(0, currentIndex - 1));
  const goNext = () => onChangeIndex(Math.min(photos.length - 1, currentIndex + 1));

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const handleTouchEnd = () => {
    const SWIPE_THRESHOLD = 50;
    if (touchDeltaX.current > SWIPE_THRESHOLD) goPrev();
    else if (touchDeltaX.current < -SWIPE_THRESHOLD) goNext();
    touchDeltaX.current = 0;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center text-white text-4xl leading-none hover:text-moss-light bg-white/10 rounded-full z-10"
        onClick={onClose}
        aria-label="閉じる"
      >
        ×
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        {currentIndex + 1} / {photos.length}
      </div>

      {/* Image area with swipe */}
      <div
        className="flex-1 flex items-center justify-center w-full px-12"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[currentIndex]}
          alt={`${alt} - ${currentIndex + 1}`}
          className="max-w-full max-h-full object-contain rounded-lg"
        />
      </div>

      {/* Arrow buttons (desktop) */}
      {currentIndex > 0 && (
        <button
          className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl p-2"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          aria-label="前の写真"
        >
          ‹
        </button>
      )}
      {currentIndex < photos.length - 1 && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl p-2"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          aria-label="次の写真"
        >
          ›
        </button>
      )}

      {/* Credit */}
      {credits[currentIndex] && (
        <div className="absolute bottom-14 text-white/50 text-xs text-center px-4 truncate max-w-full">
          {credits[currentIndex]}
        </div>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-6 flex gap-2">
        {photos.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === currentIndex ? 'bg-white' : 'bg-white/30'
            }`}
            onClick={(e) => { e.stopPropagation(); onChangeIndex(i); }}
            aria-label={`写真 ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

function RemotePhoto({ url, alt, credit, onClick }: { url: string; alt: string; credit?: string; onClick: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const imgRef = useRef<HTMLImageElement>(null);

  // ブラウザキャッシュから即座に画像が読まれた場合、onLoad ハンドラ登録前に
  // load イベントが発火して取りこぼす（リロード時に status が loading のまま
  // 固まる症状）。マウント時に complete && naturalWidth > 0 を確認して補正する。
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      if (img.naturalWidth > 0) setStatus('loaded');
      else setStatus('error');
    }
  }, [url]);

  return (
    <div className="flex flex-col">
      <button
        className="relative aspect-square w-full rounded-md overflow-hidden bg-soil-surface cursor-pointer"
        onClick={onClick}
        aria-label={alt}
      >
        {status === 'loading' && (
          <div
            className="absolute inset-0 animate-shimmer"
            aria-hidden="true"
          />
        )}
        {status !== 'error' && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={imgRef}
            src={url}
            alt={alt}
            loading="lazy"
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              status === 'loaded' ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setStatus('loaded')}
            onError={() => setStatus('error')}
          />
        )}
        {status === 'error' && (
          <div className="w-full h-full flex items-center justify-center text-washi-dim text-xs">
            読込失敗
          </div>
        )}
      </button>
      {credit && (
        <p className="text-[10px] text-washi-dim truncate mt-0.5 px-0.5 mono-data">{credit}</p>
      )}
    </div>
  );
}

function MyRecordsList({ mushroomId }: { mushroomId: string }) {
  const { getRecordsByMushroomId } = useRecords();
  const myRecords = getRecordsByMushroomId(mushroomId);

  return (
    <div>
      <SectionHeading>{UI_TEXT.zukan.myRecords}</SectionHeading>
      {myRecords.length === 0 ? (
        <p className="text-sm text-moss-light">{UI_TEXT.zukan.noRecords}</p>
      ) : (
        <div className="space-y-2">
          {myRecords.map((record) => (
            <Link
              key={record.id}
              href={`/records/detail?id=${record.id}`}
              className="block rounded-lg bg-soil-surface p-3 hover:bg-soil-elevated transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-washi-cream">
                    {new Date(record.observed_at).toLocaleDateString('ja-JP')}
                  </span>
                  {record.location.description && (
                    <span className="text-moss-light ml-2">{record.location.description}</span>
                  )}
                </div>
                <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold text-white ${
                  record.harvested ? 'bg-washi-dim' : 'bg-blue-600'
                }`}>
                  {record.harvested ? '採取' : '観察'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
