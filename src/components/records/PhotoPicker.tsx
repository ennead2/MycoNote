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
      if (!cancelled) {
        setPreviews(urls);
      }
    }
    loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [photos]);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const compressed = await Promise.all(
      Array.from(files).map((file) => compressImage(file))
    );
    onPhotosChange([...photos, ...compressed]);

    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(updated);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button type="button" onClick={handleClick}>
          {UI_TEXT.records.form.photosAdd}
        </button>
        {photos.length > 0 && <span>{photos.length}枚</span>}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {previews.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
          {previews.map((url, index) => (
            <div key={index} style={{ position: 'relative' }}>
              <img
                src={url}
                alt={`写真 ${index + 1}`}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
              />
              <button
                type="button"
                onClick={() => handleRemove(index)}
                style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  background: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  lineHeight: '20px',
                  textAlign: 'center',
                  padding: 0,
                }}
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
