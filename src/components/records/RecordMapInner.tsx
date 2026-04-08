'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MushroomRecord } from '@/types/record';

// Fix Leaflet default marker icon issue with bundlers
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface RecordMapInnerProps {
  records: MushroomRecord[];
}

export function RecordMapInner({ records }: RecordMapInnerProps) {
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
          <Marker key={record.id} position={[record.location.lat, record.location.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{record.mushroom_name_ja || '不明'}</strong>
                <br />
                {record.location.description && <span>{record.location.description}<br /></span>}
                {new Date(record.observed_at).toLocaleDateString('ja-JP')}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
