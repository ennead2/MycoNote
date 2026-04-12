'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { SeasonBar } from '@/components/zukan/SeasonBar';
import { ChipTag } from '@/components/ui/ChipTag';
import { getMushroomById } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import { renderColorText } from '@/lib/color-text';
import { useRecords } from '@/contexts/RecordsContext';
import type { Mushroom } from '@/types/mushroom';

interface MushroomDetailProps {
  mushroom: Mushroom;
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-bold text-moss-light mb-2">{children}</h2>
);

export function MushroomDetail({ mushroom }: MushroomDetailProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Filter out empty strings so lightbox only navigates valid photos
  const allPhotos = [
    ...(mushroom.image_local ? [mushroom.image_local] : []),
    ...mushroom.images_remote,
  ];
  const allCredits = [
    ...(mushroom.image_local ? [''] : []),
    ...(mushroom.images_remote_credits || mushroom.images_remote.map(() => '')),
  ];
  const heroSrc = mushroom.image_local || mushroom.images_remote[0] || null;
  const similarSpecies = mushroom.similar_species
    .map((id) => getMushroomById(id))
    .filter((m): m is Mushroom => m !== undefined);

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
      {mushroom.images_remote.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-moss-light mb-2">{UI_TEXT.zukan.additionalPhotos}</h2>
          <div className="grid grid-cols-3 gap-2">
            {mushroom.images_remote.map((url, i) => (
              <RemotePhoto
                key={i}
                url={url}
                alt={`${mushroom.names.ja} - ${i + 1}`}
                credit={mushroom.images_remote_credits?.[i]}
                onClick={() => setLightboxIndex(i + 1)}
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
        <span>🔎</span>
        <span>{UI_TEXT.zukan.googleImageSearch}</span>
        <span className="text-xs">↗</span>
      </a>

      {/* Lightbox modal with swipe */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          credits={allCredits}
          currentIndex={lightboxIndex}
          alt={mushroom.names.ja}
          onClose={() => setLightboxIndex(null)}
          onChangeIndex={setLightboxIndex}
        />
      )}

      {/* 2. Name + ToxicityBadge + scientific name + aliases */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold text-washi-cream">{mushroom.names.ja}</h1>
          <ToxicityBadge toxicity={mushroom.toxicity} />
        </div>
        <p className="text-sm text-moss-light italic">{mushroom.names.scientific}</p>
        {mushroom.names.aliases && mushroom.names.aliases.length > 0 && (
          <p className="text-xs text-washi-dim mt-1">{mushroom.names.aliases.join('、')}</p>
        )}
      </div>

      {/* 3. Caution box (if caution exists) */}
      {mushroom.caution && (
        <div
          role="alert"
          className="border border-red-500 bg-red-950/50 rounded-lg p-4"
        >
          <h2 className="text-sm font-bold text-red-400 mb-2">⚠ 注意事項</h2>
          <p className="text-sm text-red-200">{renderColorText(mushroom.caution)}</p>
        </div>
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
        <SeasonBar
          startMonth={mushroom.season.start_month}
          endMonth={mushroom.season.end_month}
        />
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

      {/* 10. Similar species (if exists) */}
      {similarSpecies.length > 0 && (
        <div>
          <SectionHeading>{UI_TEXT.zukan.similarSpecies}</SectionHeading>
          <div className="flex flex-col gap-3">
            {similarSpecies.map((species) => (
              <Link
                key={species.id}
                href={`/zukan/${species.id}`}
                className="flex items-center gap-3 bg-soil-surface rounded-lg p-3 hover:bg-soil-elevated transition-colors"
              >
                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-soil-elevated">
                  <Image
                    src={species.image_local}
                    alt={species.names.ja}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-washi-cream">{species.names.ja}</span>
                  <ToxicityBadge toxicity={species.toxicity} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 11. My records for this species */}
      <MyRecordsSection mushroomId={mushroom.id} />
    </div>
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
