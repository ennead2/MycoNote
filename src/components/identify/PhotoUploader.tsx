// src/components/identify/PhotoUploader.tsx
'use client';

import { useRef } from 'react';
import { compressImage } from '@/lib/photo';
import { UI_TEXT } from '@/constants/ui-text';
import type { Base64Image } from '@/types/chat';

interface PhotoUploaderProps {
  images: Base64Image[];
  onImagesChange: (images: Base64Image[]) => void;
}

async function blobToBase64Image(blob: Blob): Promise<Base64Image> {
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('読み取り失敗'));
    reader.readAsDataURL(blob);
  });
  const [header, data] = dataUrl.split(',');
  const mediaType = header.match(/image\/(jpeg|png|webp)/)?.[0] ?? 'image/jpeg';
  return { data, mediaType: mediaType as Base64Image['mediaType'] };
}

export function PhotoUploader({ images, onImagesChange }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: Base64Image[] = [];
    for (const file of Array.from(files)) {
      const compressed = await compressImage(file);
      const base64 = await blobToBase64Image(compressed);
      newImages.push(base64);
    }
    onImagesChange([...images, ...newImages]);
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-forest-700 transition-colors hover:border-forest-400 hover:bg-forest-50"
        >
          <span className="text-lg">+</span>
          {UI_TEXT.identify.addPhoto}
        </button>
        {images.length > 0 && (
          <span className="text-sm text-gray-500">{images.length}枚</span>
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

      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, index) => (
            <div key={index} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${img.mediaType};base64,${img.data}`}
                alt={`写真 ${index + 1}`}
                className="w-[72px] h-[72px] object-cover rounded-lg border border-gray-200"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600"
                aria-label={`写真 ${index + 1} を削除`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">{UI_TEXT.identify.photoHint}</p>
    </div>
  );
}
