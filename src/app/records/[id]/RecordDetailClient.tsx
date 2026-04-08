'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRecords } from '@/contexts/RecordsContext';
import { getPhotosForRecord } from '@/lib/db';
import { blobToDataUrl } from '@/lib/photo';
import { getMushroomById } from '@/data/mushrooms';
import { ToxicityBadge } from '@/components/zukan/ToxicityBadge';
import { Button } from '@/components/ui/Button';
import PageHeader from '@/components/layout/PageHeader';
import { UI_TEXT } from '@/constants/ui-text';
import type { Mushroom } from '@/types/mushroom';

interface RecordDetailClientProps {
  id: string;
}

export default function RecordDetailClient({ id }: RecordDetailClientProps) {
  const router = useRouter();
  const { records, removeRecord } = useRecords();
  const record = records.find((r) => r.id === id);

  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [mushroom, setMushroom] = useState<Mushroom | undefined>(undefined);

  useEffect(() => {
    if (!record) return;

    // 写真を読み込む
    (async () => {
      const photos = await getPhotosForRecord(id);
      const urls = await Promise.all(photos.map((p) => blobToDataUrl(p.blob)));
      setPhotoUrls(urls);
    })();

    // キノコデータを取得
    if (record.mushroom_id) {
      setMushroom(getMushroomById(record.mushroom_id));
    }
  }, [id, record]);

  const handleDelete = async () => {
    if (!window.confirm(UI_TEXT.records.deleteConfirm)) return;
    await removeRecord(id);
    router.push('/records');
  };

  if (!record) {
    return (
      <div>
        <PageHeader title={UI_TEXT.records.title} showBack />
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-forest-400">
          記録が見つかりません
        </div>
      </div>
    );
  }

  const observedDate = new Date(record.observed_at);
  const formattedDate = observedDate.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayName = mushroom?.names.ja ?? record.mushroom_name_ja ?? '（不明）';

  return (
    <div>
      <PageHeader title={displayName} showBack />

      <div className="max-w-lg mx-auto px-4 py-4 space-y-6">
        {/* 写真ギャラリー */}
        {photoUrls.length > 0 && (
          <div className="overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {photoUrls.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`写真 ${i + 1}`}
                  className="w-32 h-32 object-cover rounded-lg shrink-0 border border-forest-700"
                />
              ))}
            </div>
          </div>
        )}

        {/* キノコリンクカード */}
        {mushroom && (
          <div className="rounded-xl bg-forest-800 border border-forest-700 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-forest-100 font-semibold truncate">{mushroom.names.ja}</span>
                <ToxicityBadge toxicity={mushroom.toxicity} compact />
              </div>
              <Link
                href={`/zukan/${mushroom.id}`}
                className="shrink-0 text-sm text-forest-400 hover:text-forest-200 transition-colors whitespace-nowrap"
              >
                図鑑を見る →
              </Link>
            </div>
          </div>
        )}

        {/* 詳細情報 */}
        <dl className="space-y-3">
          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-sm text-forest-400">日時</dt>
            <dd className="text-sm text-forest-100">{formattedDate}</dd>
          </div>

          {record.location.description && (
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-sm text-forest-400">場所</dt>
              <dd className="text-sm text-forest-100">{record.location.description}</dd>
            </div>
          )}

          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-sm text-forest-400">座標</dt>
            <dd className="text-sm text-forest-100 font-mono">
              {record.location.lat.toFixed(6)}, {record.location.lng.toFixed(6)}
            </dd>
          </div>

          <div className="flex gap-4">
            <dt className="w-24 shrink-0 text-sm text-forest-400">種別</dt>
            <dd className="text-sm text-forest-100">
              {record.harvested
                ? UI_TEXT.records.form.harvested
                : UI_TEXT.records.form.observed}
            </dd>
          </div>

          {record.quantity && (
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-sm text-forest-400">数量</dt>
              <dd className="text-sm text-forest-100">{record.quantity}</dd>
            </div>
          )}

          {record.memo && (
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-sm text-forest-400">メモ</dt>
              <dd className="text-sm text-forest-100 whitespace-pre-wrap">{record.memo}</dd>
            </div>
          )}
        </dl>

        {/* 削除ボタン */}
        <div className="pt-4 border-t border-forest-700">
          <Button
            variant="ghost"
            className="text-red-400 hover:text-red-300 hover:bg-red-950/30 w-full"
            onClick={handleDelete}
          >
            {UI_TEXT.records.deleteRecord}
          </Button>
        </div>
      </div>
    </div>
  );
}
