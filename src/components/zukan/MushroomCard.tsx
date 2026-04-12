import Link from 'next/link';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import type { Mushroom } from '@/types/mushroom';
import { ToxicityBadge } from './ToxicityBadge';

interface MushroomCardProps {
  mushroom: Mushroom;
}

/** Pick the best available image src for a species, returning null when none exist. */
function pickImageSrc(m: Mushroom): string | null {
  if (m.image_local) return m.image_local;
  if (m.images_remote && m.images_remote.length > 0) return m.images_remote[0];
  return null;
}

export function MushroomCard({ mushroom }: MushroomCardProps) {
  const src = pickImageSrc(mushroom);

  return (
    <Link
      href={`/zukan/${mushroom.id}`}
      className="group block rounded-lg bg-soil-surface border border-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-moss-light/40 hover:shadow-lg hover:shadow-moss-primary/10 active:translate-y-0"
    >
      <div className="relative aspect-square w-full bg-soil-elevated">
        {src ? (
          <Image
            src={src}
            alt={mushroom.names.ja}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            unoptimized
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-washi-dim"
            aria-label="画像なし"
          >
            <ImageOff size={24} strokeWidth={1.5} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="p-2 flex flex-col gap-1.5">
        <p className="serif-display text-washi-cream font-bold text-sm leading-tight line-clamp-2 tracking-wide">
          {mushroom.names.ja}
        </p>
        <ToxicityBadge toxicity={mushroom.toxicity} compact />
      </div>
    </Link>
  );
}
