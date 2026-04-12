'use client';

import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MushroomRecord } from '@/types/record';

// MycoNote custom map pin — Gemini-generated, mingei emblem style.
// PNGs live under /public/icons/ and ship as part of the static export.
//
// Anchor geometry (for the 48×48 render):
//  - The balloon's pointed tip sits at roughly y=40 within the 48px canvas;
//    the last ~8px is the soft drop shadow. Anchoring at (24, 40) puts the
//    tip exactly on the map coordinate and lets the shadow render under it.
//  - popupAnchor is measured from the icon anchor; -40 on y lifts the popup
//    tail just above the pin head.
const mushroomPin = L.icon({
  iconUrl: '/icons/map-pin.png',
  iconRetinaUrl: '/icons/map-pin@2x.png',
  iconSize: [48, 48],
  iconAnchor: [24, 40],
  popupAnchor: [0, -40],
});

interface RecordMapInnerProps {
  records: MushroomRecord[];
}

export function RecordMapInner({ records }: RecordMapInnerProps) {
  const router = useRouter();
  const validRecords = records.filter((r) => r.location.lat && r.location.lng);

  const center: [number, number] = validRecords.length > 0
    ? [validRecords[0].location.lat, validRecords[0].location.lng]
    : [36.0, 138.0]; // Japan center

  return (
    <div className="h-[60vh] rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={validRecords.length > 0 ? 10 : 5} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validRecords.map((record) => (
          <Marker key={record.id} position={[record.location.lat, record.location.lng]} icon={mushroomPin}>
            <Popup>
              <div
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/records/detail?id=${record.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/records/detail?id=${record.id}`); }}
                style={{ cursor: 'pointer', fontSize: '14px', lineHeight: '1.4' }}
              >
                <strong>{record.mushroom_name_ja || '不明'}</strong>
                <br />
                {record.location.description && <span>{record.location.description}<br /></span>}
                <span style={{ color: '#666' }}>{new Date(record.observed_at).toLocaleDateString('ja-JP')}</span>
                <br />
                <span style={{ color: '#4a7c23', fontSize: '12px' }}>詳細を見る →</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
