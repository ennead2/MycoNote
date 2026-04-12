import Link from 'next/link';
import Image from 'next/image';
import type { Mushroom } from '@/types/mushroom';
import { ToxicityBadge } from './ToxicityBadge';

interface MushroomCardProps {
  mushroom: Mushroom;
}

export function MushroomCard({ mushroom }: MushroomCardProps) {
  return (
    <Link
      href={`/zukan/${mushroom.id}`}
      className="group block rounded-lg bg-soil-surface border border-border overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-moss-light/40 hover:shadow-lg hover:shadow-moss-primary/10 active:translate-y-0"
    >
      <div className="relative aspect-square w-full bg-soil-elevated">
        <Image
          src={mushroom.image_local}
          alt={mushroom.names.ja}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          unoptimized
        />
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
