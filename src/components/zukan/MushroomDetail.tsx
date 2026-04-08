'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { SeasonBar } from '@/components/zukan/SeasonBar';
import { getMushroomById } from '@/data/mushrooms';
import { UI_TEXT } from '@/constants/ui-text';
import type { Mushroom } from '@/types/mushroom';

interface MushroomDetailProps {
  mushroom: Mushroom;
}

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-sm font-bold text-forest-300 mb-2">{children}</h2>
);

export function MushroomDetail({ mushroom }: MushroomDetailProps) {
  const similarSpecies = mushroom.similar_species
    .map((id) => getMushroomById(id))
    .filter((m): m is Mushroom => m !== undefined);

  return (
    <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
      {/* 1. Hero image */}
      <div className="w-full h-48 rounded-lg overflow-hidden bg-forest-800 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mushroom.image_local}
          alt={mushroom.names.ja}
          className="max-w-full max-h-full object-contain"
        />
      </div>

      {/* 2. Name + ToxicityBadge + scientific name + aliases */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h1 className="text-2xl font-bold text-forest-100">{mushroom.names.ja}</h1>
          <ToxicityBadge toxicity={mushroom.toxicity} />
        </div>
        <p className="text-sm text-forest-400 italic">{mushroom.names.scientific}</p>
        {mushroom.names.aliases && mushroom.names.aliases.length > 0 && (
          <p className="text-xs text-forest-500 mt-1">{mushroom.names.aliases.join('、')}</p>
        )}
      </div>

      {/* 3. Caution box (if caution exists) */}
      {mushroom.caution && (
        <div
          role="alert"
          className="border border-red-500 bg-red-950/50 rounded-lg p-4"
        >
          <h2 className="text-sm font-bold text-red-400 mb-2">⚠ 注意事項</h2>
          <p className="text-sm text-red-200">{mushroom.caution}</p>
        </div>
      )}

      {/* 4. Description section */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.description}</SectionHeading>
        <p className="text-sm text-forest-200 leading-relaxed">{mushroom.description}</p>
      </div>

      {/* 5. Features section */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.features}</SectionHeading>
        <p className="text-sm text-forest-200 leading-relaxed">{mushroom.features}</p>
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
            <span
              key={h}
              className="text-xs text-forest-200 bg-forest-800 rounded-full px-3 py-1"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* 8. Regions */}
      <div>
        <SectionHeading>{UI_TEXT.zukan.regions}</SectionHeading>
        <div className="flex flex-wrap gap-2">
          {mushroom.regions.map((r) => (
            <span key={r} className="text-xs text-forest-300">
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
              <span
                key={t}
                className="text-xs text-forest-200 bg-forest-800 rounded-full px-3 py-1"
              >
                {t}
              </span>
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
                className="flex items-center gap-3 bg-forest-800 rounded-lg p-3 hover:bg-forest-700 transition-colors"
              >
                <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-forest-700">
                  <Image
                    src={species.image_local}
                    alt={species.names.ja}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-forest-100">{species.names.ja}</span>
                  <ToxicityBadge toxicity={species.toxicity} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
