/**
 * EXIF metadata extraction for record auto-fill.
 *
 * Called on the **raw** photo blob (before compressImage, which strips EXIF
 * because it rerenders via canvas). Safe to use in browser; errors are
 * swallowed because photos may be stripped, unsupported, or corrupt.
 */
import exifr from 'exifr';

/**
 * Convert a raw GPS coordinate from EXIF into a signed decimal.
 *
 * The EXIF spec stores lat/lng as an array of three rationals [deg, min, sec]
 * and a separate Ref tag ("N"/"S" or "E"/"W"). `exifr` may surface the value
 * either as the tuple or as a single pre-converted decimal — we handle both.
 *
 * When the Ref tag is missing (some phones — notably Xiaomi/HyperOS — omit
 * it), we assume the value is already signed or fall back to positive.
 */
function deriveDecimalCoord(value: unknown, ref: unknown): number | null {
  if (value == null) return null;

  let decimal: number | null = null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    decimal = value;
  } else if (Array.isArray(value) && value.length >= 3) {
    const [d, m, s] = value.map((v) => (typeof v === 'number' ? v : Number(v)));
    if ([d, m, s].every((n) => Number.isFinite(n))) {
      decimal = d + m / 60 + s / 3600;
    }
  }

  if (decimal === null || !Number.isFinite(decimal)) return null;

  // Apply hemisphere sign. If Ref missing, preserve whatever sign the decimal
  // already has (some writers put the sign directly in the value).
  if (typeof ref === 'string') {
    const r = ref.trim().toUpperCase();
    if (r === 'S' || r === 'W') decimal = -Math.abs(decimal);
    else if (r === 'N' || r === 'E') decimal = Math.abs(decimal);
  }

  return decimal;
}

export interface ExifMetadata {
  /** Observation time from EXIF DateTimeOriginal (wall-clock time of capture). */
  observedAt?: Date;
  /** Decimal lat/lng from GPS tags. Absent if photo has no location. */
  location?: { lat: number; lng: number };
  /** Raw parsed EXIF block — retained for the in-UI debug panel. */
  _debug?: {
    date: unknown;
    gps: unknown;
  };
}

/**
 * Extract the fields we care about for RecordForm auto-fill.
 * Returns `{}` for photos without EXIF (SNS-stripped, screenshots, etc.).
 * Never throws.
 *
 * Date and GPS are parsed in separate `exifr` calls because:
 *   1. GPS tags live in a different IFD and `exifr.gps()` is the recommended
 *      helper — it's more reliable than passing `gps: true` + `pick`.
 *   2. A failure parsing one shouldn't block the other (e.g. stripped GPS
 *      block shouldn't lose the date).
 */
export async function extractExifMetadata(blob: Blob): Promise<ExifMetadata> {
  const result: ExifMetadata = { _debug: { date: null, gps: null } };

  // --- Date ---
  try {
    const parsed = await exifr.parse(blob, ['DateTimeOriginal', 'CreateDate', 'ModifyDate']);
    if (result._debug) result._debug.date = parsed ?? null;
    if (parsed) {
      const when: unknown = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.ModifyDate;
      if (when instanceof Date && !Number.isNaN(when.getTime())) {
        result.observedAt = when;
      }
    }
  } catch (err) {
    console.debug('[exif] date parse failed:', err);
    if (result._debug) result._debug.date = { error: String(err) };
  }

  // --- GPS ---
  // First try exifr's decimal helper. If it yields NaN / undefined (which
  // happens on some phones — Xiaomi/HyperOS has been observed writing GPS
  // without the usual Ref tags), fall back to manually converting the raw
  // GPS IFD values ourselves.
  try {
    const gps = await exifr.gps(blob);
    if (result._debug) result._debug.gps = gps ?? null;
    if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number'
        && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude)) {
      result.location = { lat: gps.latitude, lng: gps.longitude };
    }
  } catch (err) {
    console.debug('[exif] gps parse failed:', err);
    if (result._debug) result._debug.gps = { error: String(err) };
  }

  // Fallback: read raw GPS IFD tags and do DMS → decimal ourselves.
  if (!result.location) {
    try {
      // Passing a tag-name array as the second arg is exifr's "pick these raw
      // tag values" mode. We get the unprocessed GPS tuples + Ref tags back.
      const rawGps = await exifr.parse(blob, [
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef',
      ]);
      if (result._debug) {
        const existing = (result._debug.gps as object | null) ?? {};
        result._debug.gps = { ...existing, rawIfd: rawGps ?? null };
      }
      if (rawGps) {
        const lat = deriveDecimalCoord(rawGps.GPSLatitude, rawGps.GPSLatitudeRef);
        const lng = deriveDecimalCoord(rawGps.GPSLongitude, rawGps.GPSLongitudeRef);
        if (lat !== null && lng !== null) {
          result.location = { lat, lng };
        }
      }
    } catch (err) {
      console.debug('[exif] raw gps fallback failed:', err);
      if (result._debug) {
        const existing = (result._debug.gps as object | null) ?? {};
        result._debug.gps = { ...existing, fallbackError: String(err) };
      }
    }
  }

  // Surface a concise summary in the console so the user can inspect what
  // actually came out of the image on their phone.
  if (typeof window !== 'undefined') {
    console.info(
      '[exif] scan →',
      {
        file: blob instanceof File ? blob.name : '(Blob)',
        size: blob.size,
        type: blob.type,
        date: result.observedAt?.toISOString() ?? null,
        location: result.location ?? null,
        rawDate: result._debug?.date,
        rawGps: result._debug?.gps,
      },
    );
  }

  return result;
}

