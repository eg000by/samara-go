import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import {
  AttributionControl,
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';

import { RARITY_COLOR, RARITY_LABEL, rarityStyle, seedImage } from '../../lib/seeds';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { LatLon } from '../../types';
import { collectSeed, fetchInventory, fetchMap } from './gameSlice';

// Дворцовая площадь — центр карты и точка по умолчанию.
const CENTER: LatLon = { lat: 59.9398, lon: 30.3146 };
const COLLECT_RADIUS_M = 50;

const GREEN = '#3E9B4F'; // brand-primary — игрок и радиус сбора

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
        <button className="soft" onClick={() => setPos(CENTER)}>
          ↺ В центр Питера
        </button>
        <span className="hint">клик по карте — переместиться (демо)</span>
      </div>

      <MapContainer
        center={[pos.lat, pos.lon]}
        zoom={15}
        className="leaflet"
        attributionControl={false}
      >
        {/* prefix={false} убирает «Leaflet 🇺🇦» из подписи; атрибуцию OSM оставляем */}
        <AttributionControl prefix={false} />
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
          pathOptions={{ color: GREEN, weight: 1.5, fillColor: GREEN, fillOpacity: 0.08 }}
        />
        <CircleMarker
          center={[pos.lat, pos.lon]}
          radius={8}
          pathOptions={{ color: '#fff', weight: 3, fillColor: GREEN, fillOpacity: 1 }}
        />

        {seeds.map((seed) => (
          <CircleMarker
            key={seed.id}
            center={[seed.lat, seed.lon]}
            radius={8}
            pathOptions={{
              color: '#fff',
              weight: 2,
              fillColor: RARITY_COLOR[seed.rarity],
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <div className="popup-seed">
                <span className="seed-thumb" style={rarityStyle(seed.rarity)}>
                  <img src={seedImage(seed.seed_type)} alt="" />
                </span>
                <span className="popup-name">{seed.name}</span>
                <span className="popup-meta">
                  {RARITY_LABEL[seed.rarity]} · 📍 {Math.round(seed.dist_m)} м
                </span>
                <button
                  disabled={!seed.can_collect}
                  onClick={() => void dispatch(collectSeed({ id: seed.id, pos }))}
                >
                  {seed.can_collect ? '🌱 Собрать' : 'Слишком далеко'}
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
