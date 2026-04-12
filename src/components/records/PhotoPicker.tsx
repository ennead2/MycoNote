'use client';

import { useRef, useEffect, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { compressImage, blobToDataUrl } from '@/lib/photo';
import { extractExifMetadata, type ExifMetadata } from '@/lib/exif';
import { UI_TEXT } from '@/constants/ui-text';

interface PhotoPickerProps {
  photos: Blob[];
  onPhotosChange: (photos: Blob[]) => void;
  /**
   * Optional: called with EXIF metadata extracted from the first newly-added
   * file that has any usable metadata. EXIF is read from the raw File BEFORE
   * compressImage (canvas-based compression strips EXIF). The callee decides
   * how to use it (e.g. RecordForm auto-fills empty date / GPS fields).
   */
  onPhotosMetadata?: (metadata: ExifMetadata) => void;
}

export function PhotoPicker({ photos, onPhotosChange, onPhotosMetadata }: PhotoPickerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const rawFiles = Array.from(files);

    // EXIF must be read from the *raw* File before compressImage strips it via
    // canvas rerender. Walk files in order and surface metadata from the first
    // one that yields anything useful (date and/or location).
    if (onPhotosMetadata) {
      for (const file of rawFiles) {
        const meta = await extractExifMetadata(file);
        if (meta.observedAt || meta.location) {
          onPhotosMetadata(meta);
          break;
        }
      }
    }

    const compressed = await Promise.all(rawFiles.map((file) => compressImage(file)));
    onPhotosChange([...photos, ...compressed]);
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-surface px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
        >
          <Camera size={16} aria-hidden="true" />
          {UI_TEXT.records.form.photosTake}
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-washi-dim bg-soil-surface px-3.5 py-2 text-sm font-medium text-washi-muted transition-colors hover:bg-soil-elevated hover:border-moss-light hover:text-washi-cream"
        >
          <ImagePlus size={16} aria-hidden="true" />
          {UI_TEXT.records.form.photosChoose}
        </button>
        {photos.length > 0 && (
          <span className="text-sm text-moss-light mono-data">{photos.length}枚</span>
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

      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {previews.map((url, index) => (
            <div key={index} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`写真 ${index + 1}`}
                className="w-20 h-20 object-cover rounded-lg border border-border"
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
    </div>
  );
}
