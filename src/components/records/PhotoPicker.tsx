'use client';

import { useRef, useEffect, useState } from 'react';
import { compressImage, blobToDataUrl } from '@/lib/photo';
import { UI_TEXT } from '@/constants/ui-text';

interface PhotoPickerProps {
  photos: Blob[];
  onPhotosChange: (photos: Blob[]) => void;
}

export function PhotoPicker({ photos, onPhotosChange }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPreviews() {
      const urls = await Promise.all(photos.map((blob) => blobToDataUrl(blob)));
      if (!cancelled) setPreviews(urls);
    }
    loadPreviews();
    return () => { cancelled = true; };
  }, [photos]);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const compressed = await Promise.all(
      Array.from(files).map((file) => compressImage(file))
    );
    onPhotosChange([...photos, ...compressed]);
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 rounded-lg border border-dashed border-forest-500 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-200 transition-colors hover:bg-forest-700 hover:border-forest-400"
        >
          <span className="text-lg">📷</span>
          {UI_TEXT.records.form.photosAdd}
        </button>
        {photos.length > 0 && (
          <span className="text-sm text-forest-400">{photos.length}枚</span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {previews.map((url, index) => (
            <div key={index} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`写真 ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-forest-700"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs flex items-center justify-center hover:bg-red-500"
                aria-label={`写真 ${index + 1} を削除`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
