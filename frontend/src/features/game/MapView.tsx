import { useEffect, useRef, useState } from 'react';
import type ymaps from 'yandex-maps';
import { Circle, Map, Placemark, YMaps } from '@pbe/react-yandex-maps';

import { RARITY_COLOR, RARITY_LABEL, rarityStyle, seedImage } from '../../lib/seeds';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { LatLon } from '../../types';
import { collectSeed, fetchInventory, fetchMap } from './gameSlice';

// Дворцовая площадь — центр карты и точка по умолчанию.
const CENTER: LatLon = { lat: 59.9398, lon: 30.3146 };
const COLLECT_RADIUS_M = 50;
const GREEN = '#3E9B4F'; // brand-primary — игрок и радиус сбора

// Ключ JavaScript API Яндекс.Карт (публичный, привязывается к домену в кабинете).
const APIKEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY ?? '';

export function MapView() {
  const dispatch = useAppDispatch();
  const seeds = useAppSelector((s) => s.game.seeds);
  const [pos, setPos] = useState<LatLon>(CENTER);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapRef = useRef<ymaps.Map | null>(null);

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  // при каждой смене позиции — перезапрос карты + поллинг каждые 15 c
  useEffect(() => {
    void dispatch(fetchMap(pos));
    const t = setInterval(() => void dispatch(fetchMap(pos)), 15_000);
    return () => clearInterval(t);
  }, [dispatch, pos]);

  // рецентрируем карту при смене позиции игрока (не на каждый ререндер)
  useEffect(() => {
    mapRef.current?.setCenter([pos.lat, pos.lon]);
  }, [pos]);

  function useGps() {
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => alert(`Геолокация недоступна: ${err.message}`),
    );
  }

  // выбранное семя берём из актуального списка — чтобы can_collect/dist обновлялись
  const selected = seeds.find((s) => s.id === selectedId) ?? null;

  if (!APIKEY) {
    return (
      <div className="map-wrap">
        <div className="map-nokey">
          <b>Карта Яндекса не настроена</b>
          <p className="muted">
            Добавь ключ JavaScript API в <code>VITE_YANDEX_MAPS_API_KEY</code> (frontend/.env) и
            пересобери фронтенд.
          </p>
        </div>
      </div>
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

      <div className="leaflet">
        <YMaps query={{ apikey: APIKEY, lang: 'ru_RU' }}>
          <Map
            defaultState={{ center: [pos.lat, pos.lon], zoom: 15 }}
            width="100%"
            height="100%"
            instanceRef={(ref) => {
              mapRef.current = ref;
            }}
            onClick={(e: ymaps.IEvent) => {
              const c = e.get('coords') as [number, number] | undefined;
              if (c) {
                setPos({ lat: c[0], lon: c[1] });
                setSelectedId(null);
              }
            }}
          >
            {/* радиус сбора */}
            <Circle
              geometry={[[pos.lat, pos.lon], COLLECT_RADIUS_M]}
              options={{
                fillColor: `${GREEN}1F`,
                strokeColor: GREEN,
                strokeWidth: 2,
                interactivityModel: 'default#transparent',
              }}
            />
            {/* игрок */}
            <Placemark
              geometry={[pos.lat, pos.lon]}
              options={{ preset: 'islands#circleIcon', iconColor: GREEN }}
            />
            {/* семена — цвет по редкости */}
            {seeds.map((seed) => (
              <Placemark
                key={seed.id}
                geometry={[seed.lat, seed.lon]}
                options={{ preset: 'islands#circleDotIcon', iconColor: RARITY_COLOR[seed.rarity] }}
                onClick={() => setSelectedId(seed.id)}
              />
            ))}
          </Map>
        </YMaps>
      </div>

      {/* карточка выбранного семени со сбором */}
      {selected && (
        <div className="map-seedcard">
          <span className="seed-thumb" style={rarityStyle(selected.rarity)}>
            <img src={seedImage(selected.seed_type)} alt="" />
          </span>
          <div className="msc-info">
            <b>{selected.name}</b>
            <small className="popup-meta">
              {RARITY_LABEL[selected.rarity]} · 📍 {Math.round(selected.dist_m)} м
            </small>
          </div>
          <button
            disabled={!selected.can_collect}
            onClick={() => {
              void dispatch(collectSeed({ id: selected.id, pos }));
              setSelectedId(null);
            }}
          >
            {selected.can_collect ? '🌱 Собрать' : 'Далеко'}
          </button>
        </div>
      )}
    </div>
  );
}
