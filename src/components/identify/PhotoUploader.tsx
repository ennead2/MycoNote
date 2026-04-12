// src/components/identify/PhotoUploader.tsx
'use client';

import { useRef } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          aria-label={`${UI_TEXT.identify.takePhoto} - ${UI_TEXT.identify.addPhoto}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-surface px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
        >
          <Camera size={16} aria-hidden="true" />
          {UI_TEXT.identify.takePhoto}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={`${UI_TEXT.identify.chooseFile} - ${UI_TEXT.identify.addPhoto}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-surface px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
        >
          <ImagePlus size={16} aria-hidden="true" />
          {UI_TEXT.identify.chooseFile}
        </button>
        {images.length > 0 && (
          <span className="text-sm text-moss-light mono-data">{images.length}枚</span>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
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
                className="w-[72px] h-[72px] object-cover rounded-lg border border-border"
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-safety-deadly text-washi-cream flex items-center justify-center hover:bg-safety-toxic transition-colors"
                aria-label={`写真 ${index + 1} を削除`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-washi-dim">{UI_TEXT.identify.photoHint}</p>
    </div>
  );
}
