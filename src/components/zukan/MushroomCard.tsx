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
      className="block rounded-lg bg-forest-800 border border-forest-700 hover:bg-forest-700 transition-colors overflow-hidden"
    >
      <div className="relative aspect-square w-full bg-forest-900">
        <Image
          src={mushroom.image_local}
          alt={mushroom.names.ja}
          fill
          className="object-cover"
          unoptimized
        />
      </div>
      <div className="p-2 flex flex-col gap-1">
        <p className="text-forest-100 font-semibold text-sm leading-tight line-clamp-2">
          {mushroom.names.ja}
        </p>
        <ToxicityBadge toxicity={mushroom.toxicity} />
      </div>
    </Link>
  );
}
