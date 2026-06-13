import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { LatLon, Rarity } from '../../types';
import { collectSeed, fetchInventory, fetchMap } from './gameSlice';

// Дворцовая площадь — центр карты и точка по умолчанию.
const CENTER: LatLon = { lat: 59.9398, lon: 30.3146 };
const COLLECT_RADIUS_M = 50;

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// Клик по карте «перемещает» игрока (демо: ревьюер не в Питере физически).
function ClickToMove({ onMove }: { onMove: (p: LatLon) => void }) {
  useMapEvents({
    click(e) {
      onMove({ lat: e.latlng.lat, lon: e.latlng.lng });
    },
  });
  return null;
}

// Держим игрока в центре вьюпорта при смене позиции (например, по GPS).
function Recenter({ pos }: { pos: LatLon }) {
  const map = useMap();
  useEffect(() => {
    map.setView([pos.lat, pos.lon]);
  }, [map, pos]);
  return null;
}

export function MapView() {
  const dispatch = useAppDispatch();
  const seeds = useAppSelector((s) => s.game.seeds);
  const [pos, setPos] = useState<LatLon>(CENTER);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  // при каждой смене позиции — перезапрос карты + поллинг каждые 15 c
  useEffect(() => {
    void dispatch(fetchMap(pos));
    const t = setInterval(() => void dispatch(fetchMap(pos)), 15_000);
    return () => clearInterval(t);
  }, [dispatch, pos]);

  function useGps() {
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => alert(`Геолокация недоступна: ${err.message}`),
    );
  }

  return (
    <div className="map-wrap">
      <div className="map-toolbar">
        <button onClick={useGps}>📍 Моё GPS</button>
        <button className="link" onClick={() => setPos(CENTER)}>
          ↺ В центр Питера
        </button>
        <span className="muted">клик по карте — переместиться (демо)</span>
      </div>

      <MapContainer center={[pos.lat, pos.lon]} zoom={15} className="leaflet">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToMove onMove={setPos} />
        <Recenter pos={pos} />

        {/* радиус сбора и сам игрок */}
        <Circle
          center={[pos.lat, pos.lon]}
          radius={COLLECT_RADIUS_M}
          pathOptions={{ color: '#2563eb', weight: 1, fillOpacity: 0.05 }}
        />
        <CircleMarker
          center={[pos.lat, pos.lon]}
          radius={8}
          pathOptions={{ color: '#fff', weight: 2, fillColor: '#2563eb', fillOpacity: 1 }}
        />

        {seeds.map((seed) => (
          <CircleMarker
            key={seed.id}
            center={[seed.lat, seed.lon]}
            radius={7}
            pathOptions={{
              color: RARITY_COLOR[seed.rarity],
              fillColor: RARITY_COLOR[seed.rarity],
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <b>{seed.name}</b>
              <br />
              <small className="muted">
                {seed.rarity} · {Math.round(seed.dist_m)} м
              </small>
              <br />
              <button
                disabled={!seed.can_collect}
                onClick={() => void dispatch(collectSeed({ id: seed.id, pos }))}
              >
                {seed.can_collect ? 'Собрать' : 'Слишком далеко'}
              </button>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
