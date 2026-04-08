'use client';

import { useState, useEffect } from 'react';
import { MushroomRecord } from '@/types/record';
import { mushrooms } from '@/data/mushrooms';
import { getCurrentPosition } from '@/lib/geolocation';
import { UI_TEXT } from '@/constants/ui-text';
import { PhotoPicker } from './PhotoPicker';
import { Button } from '@/components/ui/Button';

export type RecordInput = Omit<MushroomRecord, 'id' | 'created_at' | 'updated_at'>;

interface RecordFormProps {
  onSubmit: (data: RecordInput, photos: Blob[]) => Promise<void>;
  initialData?: MushroomRecord;
}

function toDatetimeLocal(iso: string): string {
  // ISO 文字列を datetime-local input 用にフォーマット
  return iso.slice(0, 16);
}

function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date().toISOString());
}

const inputClass =
  'w-full rounded-lg bg-forest-800 border border-forest-600 text-forest-100 placeholder-forest-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-forest-400';

const labelClass = 'block text-sm font-medium text-forest-300 mb-1';

export function RecordForm({ onSubmit, initialData }: RecordFormProps) {
  const [mushroomId, setMushroomId] = useState(initialData?.mushroom_id ?? '');
  const [mushroomNameManual, setMushroomNameManual] = useState(
    initialData?.mushroom_name_ja ?? ''
  );
  const [observedAt, setObservedAt] = useState(
    initialData ? toDatetimeLocal(initialData.observed_at) : ''
  );

  useEffect(() => {
    if (!initialData) {
      setObservedAt(nowDatetimeLocal());
    }
  }, [initialData]);
  const [lat, setLat] = useState(
    initialData?.location.lat != null ? String(initialData.location.lat) : ''
  );
  const [lng, setLng] = useState(
    initialData?.location.lng != null ? String(initialData.location.lng) : ''
  );
  const [locationDescription, setLocationDescription] = useState(
    initialData?.location.description ?? ''
  );
  const [photos, setPhotos] = useState<Blob[]>([]);
  const [quantity, setQuantity] = useState(initialData?.quantity ?? '');
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [harvested, setHarvested] = useState(initialData?.harvested ?? true);

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGps = async () => {
    setGpsLoading(true);
    setGpsError('');
    try {
      const pos = await getCurrentPosition();
      setLat(String(pos.lat));
      setLng(String(pos.lng));
    } catch {
      setGpsError(UI_TEXT.records.form.gpsFailed);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedMushroom = mushroomId
        ? mushrooms.find((m) => m.id === mushroomId)
        : undefined;

      const data: RecordInput = {
        mushroom_id: mushroomId || undefined,
        mushroom_name_ja:
          selectedMushroom?.names.ja || mushroomNameManual || undefined,
        observed_at: new Date(observedAt).toISOString(),
        location: {
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          description: locationDescription || undefined,
        },
        photos: [],
        quantity: quantity || undefined,
        memo: memo || undefined,
        harvested,
      };

      await onSubmit(data, photos);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showManualInput = !mushroomId;

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* キノコの種類 */}
      <div>
        <label htmlFor="mushroom-select" className={labelClass}>
          {UI_TEXT.records.form.mushroom}
        </label>
        <select
          id="mushroom-select"
          value={mushroomId}
          onChange={(e) => {
            setMushroomId(e.target.value);
            if (e.target.value) setMushroomNameManual('');
          }}
          className={inputClass}
        >
          <option value="">{UI_TEXT.records.form.mushroomPlaceholder}</option>
          {mushrooms.map((m) => (
            <option key={m.id} value={m.id}>
              {m.names.ja}
            </option>
          ))}
        </select>

        {showManualInput && (
          <div className="mt-2">
            <label htmlFor="mushroom-manual" className={labelClass}>
              {UI_TEXT.records.form.mushroomNameManual}
            </label>
            <input
              id="mushroom-manual"
              type="text"
              value={mushroomNameManual}
              onChange={(e) => setMushroomNameManual(e.target.value)}
              placeholder={UI_TEXT.records.form.mushroomPlaceholder}
              className={inputClass}
            />
          </div>
        )}
      </div>

      {/* 日時 */}
      <div>
        <label htmlFor="observed-at" className={labelClass}>
          {UI_TEXT.records.form.date}
        </label>
        <input
          id="observed-at"
          type="datetime-local"
          value={observedAt}
          onChange={(e) => setObservedAt(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {/* 場所 */}
      <div>
        <label htmlFor="location-description" className={labelClass}>
          {UI_TEXT.records.form.location}
        </label>
        <div className="flex gap-2 mb-2">
          <input
            id="lat"
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="緯度"
            className={`${inputClass} flex-1`}
            aria-label="緯度"
          />
          <input
            id="lng"
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="経度"
            className={`${inputClass} flex-1`}
            aria-label="経度"
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleGps}
          disabled={gpsLoading}
          className="mb-2"
        >
          {gpsLoading ? UI_TEXT.records.form.gpsGetting : UI_TEXT.records.form.gpsGet}
        </Button>
        {gpsError && (
          <p className="text-red-400 text-sm mt-1">{gpsError}</p>
        )}
        <input
          id="location-description"
          type="text"
          value={locationDescription}
          onChange={(e) => setLocationDescription(e.target.value)}
          placeholder={UI_TEXT.records.form.locationPlaceholder}
          className={inputClass}
          aria-label={UI_TEXT.records.form.locationDescription}
        />
      </div>

      {/* 写真 */}
      <div>
        <span className={labelClass}>{UI_TEXT.records.form.photos}</span>
        <PhotoPicker photos={photos} onPhotosChange={setPhotos} />
      </div>

      {/* 数量 */}
      <div>
        <label htmlFor="quantity" className={labelClass}>
          {UI_TEXT.records.form.quantity}
        </label>
        <input
          id="quantity"
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder={UI_TEXT.records.form.quantityPlaceholder}
          className={inputClass}
        />
      </div>

      {/* メモ */}
      <div>
        <label htmlFor="memo" className={labelClass}>
          {UI_TEXT.records.form.memo}
        </label>
        <textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* 採取 / 観察 トグル */}
      <div>
        <span className={labelClass}>採取状態</span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={harvested ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setHarvested(true)}
            aria-pressed={harvested}
          >
            {UI_TEXT.records.form.harvested}
          </Button>
          <Button
            type="button"
            variant={!harvested ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setHarvested(false)}
            aria-pressed={!harvested}
          >
            {UI_TEXT.records.form.observed}
          </Button>
        </div>
      </div>

      {/* 保存ボタン */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        disabled={isSubmitting}
        className="w-full"
      >
        {isSubmitting ? UI_TEXT.records.form.saving : UI_TEXT.records.form.save}
      </Button>
    </form>
  );
}
