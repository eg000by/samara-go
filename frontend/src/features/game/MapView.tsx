import { useEffect, useRef, useState } from 'react';
import type ymaps from 'yandex-maps';
import { Map, Placemark, YMaps, useYMaps } from '@pbe/react-yandex-maps';

import { PinIcon } from '../../components/icons';
import { RARITY_COLOR, RARITY_LABEL, rarityStyle, seedImage } from '../../lib/seeds';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { LatLon, SeedOnMap } from '../../types';
import { collectSeed, fetchInventory, fetchMap } from './gameSlice';

// Дворцовая площадь — центр карты и точка по умолчанию.
const CENTER: LatLon = { lat: 59.9398, lon: 30.3146 };
const APIKEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY ?? '';

// Тип класса-макета метки (что возвращает templateLayoutFactory.createClass).
type Layout = ReturnType<NonNullable<ReturnType<typeof useYMaps>>['templateLayoutFactory']['createClass']>;

// Кликабельная зона метки семени (круг вокруг иконки). Без неё Яндекс
// не ловит клик по кастомному iconLayout. coordinates — px относительно якоря.
const SEED_SHAPE = { type: 'Circle', coordinates: [0, -30], radius: 26 } as ymaps.IGeometryJson;

// Внутренняя часть: рендерит карту с кастомными метками (нужен ymaps API).
function MapCanvas({
  pos,
  seeds,
  onMapClick,
  onSelect,
}: {
  pos: LatLon;
  seeds: SeedOnMap[];
  onMapClick: (p: LatLon) => void;
  onSelect: (id: number | null) => void;
}) {
  const ymapsApi = useYMaps(['templateLayoutFactory']);
  const mapRef = useRef<ymaps.Map | null>(null);
  const layoutCache = useRef<Record<string, Layout>>({});

  // рецентрируем при смене позиции игрока (не на каждый ререндер)
  useEffect(() => {
    mapRef.current?.setCenter([pos.lat, pos.lon]);
  }, [pos]);

  // макет метки игрока: 3D-персонаж (result.glb) над пульсирующим кольцом-тенью.
  // <model-viewer> грузит модель один раз; pointer-events off — клики уходят в карту.
  function playerLayout(): Layout | undefined {
    if (!ymapsApi) return undefined;
    if (!layoutCache.current.player) {
      layoutCache.current.player = ymapsApi.templateLayoutFactory.createClass(
        '<div class="ya-player3d"><span class="ya-player-halo"></span>' +
          '<model-viewer src="/result.glb" alt="персонаж" ' +
          'auto-rotate rotation-per-second="26deg" interaction-prompt="none" ' +
          'camera-orbit="0deg 82deg auto" disable-zoom loading="eager" reveal="auto" ' +
          'shadow-intensity="0.9" shadow-softness="1" exposure="1.1"></model-viewer></div>',
      );
    }
    return layoutCache.current.player;
  }

  // макет метки семени: белый кружок с кольцом редкости + глиняный овощ + хвостик
  function seedLayout(img: string, color: string): Layout | undefined {
    if (!ymapsApi) return undefined;
    const key = `${img}|${color}`;
    if (!layoutCache.current[key]) {
      layoutCache.current[key] = ymapsApi.templateLayoutFactory.createClass(
        `<div class="ya-seed"><div class="ya-seed-circle" style="border-color:${color}">` +
          `<img src="${img}"/></div><i class="ya-seed-tip"></i></div>`,
      );
    }
    return layoutCache.current[key];
  }

  function zoomBy(delta: number) {
    const m = mapRef.current;
    if (m) m.setZoom(Math.round(m.getZoom()) + delta, { duration: 200 });
  }

  return (
    <>
      <Map
        defaultState={{ center: [pos.lat, pos.lon], zoom: 15, controls: [] }}
        width="100%"
        height="100%"
        instanceRef={(ref) => {
          mapRef.current = ref;
        }}
        onClick={(e: ymaps.IEvent) => {
          const c = e.get('coords') as [number, number] | undefined;
          if (c) {
            onMapClick({ lat: c[0], lon: c[1] });
            onSelect(null);
          }
        }}
      >
        <Placemark geometry={[pos.lat, pos.lon]} options={{ iconLayout: playerLayout() }} />
        {seeds.map((seed) => (
          <Placemark
            key={seed.id}
            geometry={[seed.lat, seed.lon]}
            options={{
              iconLayout: seedLayout(seedImage(seed.seed_type), RARITY_COLOR[seed.rarity]),
              iconShape: SEED_SHAPE,
            }}
            onClick={() => onSelect(seed.id)}
          />
        ))}
      </Map>

      <div className="map-zoom">
        <button className="icon-btn" onClick={() => zoomBy(1)} aria-label="Приблизить">
          +
        </button>
        <button className="icon-btn" onClick={() => zoomBy(-1)} aria-label="Отдалить">
          −
        </button>
      </div>
    </>
  );
}

export function MapView() {
  const dispatch = useAppDispatch();
  const seeds = useAppSelector((s) => s.game.seeds);
  const [pos, setPos] = useState<LatLon>(CENTER);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [gpsOn, setGpsOn] = useState(false); // временный тумблер: следить за реальным GPS

  useEffect(() => {
    void dispatch(fetchInventory());
  }, [dispatch]);

  // при каждой смене позиции — перезапрос карты + поллинг каждые 15 c
  useEffect(() => {
    void dispatch(fetchMap(pos));
    const t = setInterval(() => void dispatch(fetchMap(pos)), 15_000);
    return () => clearInterval(t);
  }, [dispatch, pos]);

  // режим GPS: следим за реальной геопозицией (после разработки станет дефолтным)
  useEffect(() => {
    if (!gpsOn) return;
    if (!navigator.geolocation) {
      alert('Геолокация недоступна в этом браузере');
      setGpsOn(false);
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (err) => {
        alert(`Геолокация недоступна: ${err.message}`);
        setGpsOn(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [gpsOn]);

  // клик по карте перемещает игрока только в демо-режиме (когда GPS выключен)
  function handleMapClick(p: LatLon) {
    if (!gpsOn) setPos(p);
  }

  const selected = seeds.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="map-wrap">
      <div className="map-toolbar">
        <button
          className={gpsOn ? '' : 'soft'}
          onClick={() => setGpsOn((v) => !v)}
        >
          <PinIcon size={17} /> {gpsOn ? 'GPS включён' : 'Включить GPS'}
        </button>
        <span className="map-caption">
          {gpsOn ? 'двигайся в реальности — метка следует за тобой' : 'клик по карте — переместиться (демо)'}
        </span>
      </div>

      <div className="map-card">
        {APIKEY ? (
          <YMaps query={{ apikey: APIKEY, lang: 'ru_RU' }}>
            <MapCanvas pos={pos} seeds={seeds} onMapClick={handleMapClick} onSelect={setSelectedId} />
          </YMaps>
        ) : (
          <div className="map-nokey">
            <b>Карта Яндекса не настроена</b>
            <p className="muted">
              Добавь ключ JavaScript API в <code>VITE_YANDEX_MAPS_API_KEY</code> и пересобери фронтенд.
            </p>
          </div>
        )}
      </div>

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
