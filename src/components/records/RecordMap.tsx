'use client';

import { useEffect, useState } from 'react';
import type { MushroomRecord } from '@/types/record';

interface RecordMapProps {
  records: MushroomRecord[];
}

export function RecordMap({ records }: RecordMapProps) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ records: MushroomRecord[] }> | null>(null);

  useEffect(() => {
    import('./RecordMapInner').then((mod) => setMapComponent(() => mod.RecordMapInner));
  }, []);

  if (!MapComponent) {
    return (
      <div className="flex items-center justify-center h-[60vh] bg-soil-surface rounded-lg">
        <span className="text-moss-light">地図を読み込み中...</span>
      </div>
    );
  }

  return <MapComponent records={records} />;
}
