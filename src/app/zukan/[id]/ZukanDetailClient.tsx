'use client';

import PageHeader from '@/components/layout/PageHeader';
import { MushroomDetail } from '@/components/zukan/MushroomDetail';
import { getMushroomById } from '@/data/mushrooms';

interface ZukanDetailClientProps {
  id: string;
}

export default function ZukanDetailClient({ id }: ZukanDetailClientProps) {
  const mushroom = getMushroomById(id);

  if (!mushroom) {
    return (
      <div>
        <PageHeader title="キノコ図鑑" showBack={true} />
        <p className="px-4 py-8 text-center text-forest-400">
          キノコが見つかりません
        </p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={mushroom.names.ja} showBack={true} />
      <MushroomDetail mushroom={mushroom} />
    </div>
  );
}
