/**
 * EXIF metadata extraction for record auto-fill.
 *
 * Called on the **raw** photo blob (before compressImage, which strips EXIF
 * because it rerenders via canvas). Safe to use in browser; errors are
 * swallowed because photos may be stripped, unsupported, or corrupt.
 */
import exifr from 'exifr';

export interface ExifMetadata {
  /** Observation time from EXIF DateTimeOriginal (wall-clock time of capture). */
  observedAt?: Date;
  /** Decimal lat/lng from GPS tags. Absent if photo has no location. */
  location?: { lat: number; lng: number };
}

/**
 * Extract the fields we care about for RecordForm auto-fill.
 * Returns `{}` for photos without EXIF (SNS-stripped, screenshots, etc.).
 * Never throws.
 */
export async function extractExifMetadata(blob: Blob): Promise<ExifMetadata> {
  try {
    // `exifr.parse` with a narrow pick list keeps bundle / runtime cost small.
    // `gps: true` asks exifr to resolve GPSLatitude/GPSLongitude to decimal.
    const parsed = await exifr.parse(blob, {
      pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate', 'latitude', 'longitude'],
      gps: true,
    });

    if (!parsed) return {};

    const result: ExifMetadata = {};

    // Prefer DateTimeOriginal (moment the shutter fired) → CreateDate → ModifyDate.
    // exifr normalizes these into JS Date objects at the camera's local time.
    const when: unknown = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.ModifyDate;
    if (when instanceof Date && !Number.isNaN(when.getTime())) {
      result.observedAt = when;
    }

    // exifr's `gps: true` surfaces `latitude` / `longitude` as signed decimals.
    const lat: unknown = parsed.latitude;
    const lng: unknown = parsed.longitude;
    if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
      result.location = { lat, lng };
    }

    return result;
  } catch (err) {
    // Corrupt, unsupported format, or no EXIF block. Treat as "no metadata".
    console.debug('[exif] extraction failed, no metadata available:', err);
    return {};
  }
}

