import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { LockIcon, LogoutIcon } from '../../components/icons';
import { api } from '../../lib/api';
import { RARITY_COLOR, RARITY_LABEL, rarityStyle, seedImage } from '../../lib/seeds';
import { supabase } from '../../lib/supabase';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Rarity, StatsResponse } from '../../types';
import { fetchCatalog, fetchInventory } from './gameSlice';

const COLLECT_FILL = '#6FBEDD'; // sky-500
const HARVEST_FILL = '#3E9B4F'; // green-500

const CHIPS: { k: 'all' | Rarity; l: string }[] = [
  { k: 'all', l: 'Все' },
  { k: 'common', l: 'Обычные' },
  { k: 'uncommon', l: 'Необычные' },
  { k: 'rare', l: 'Редкие' },
  { k: 'epic', l: 'Эпические' },
  { k: 'legendary', l: 'Легендарные' },
];

// Садовый дневник — коллекция семян (Pokédex-стиль): прогресс, фильтр по
// редкости, сетка собранных/не найденных, недельная активность, выход.
export function DiaryView() {
  const dispatch = useAppDispatch();
  const catalog = useAppSelector((s) => s.game.catalog);
  const inventory = useAppSelector((s) => s.game.inventory);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | Rarity>('all');

  useEffect(() => {
    void dispatch(fetchCatalog());
    void dispatch(fetchInventory());
    api.stats().then(setStats).catch(console.error);
    // виды, собранные когда-либо — остаются открытыми даже при пустом инвентаре
    api.collection().then((list) => setDiscovered(new Set(list))).catch(console.error);
  }, [dispatch]);

  const qtyByType: Record<string, number> = Object.fromEntries(inventory.map((i) => [i.seed_type, i.qty]));
  const entries = Object.values(catalog);
  const total = entries.length;
  const collected = entries.filter((e) => discovered.has(e.seed_type)).length;
  const shown = entries.filter((e) => filter === 'all' || e.rarity === filter);

  const totals = stats?.totals ?? { collect: 0, plant: 0, harvest: 0 };
  const dayData = (stats?.by_day ?? []).map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="diary">
      <div className="diary-head">
        <div className="eyebrow">Мой садовый дневник</div>
        <div className="diary-title">
          <h2>Дневник</h2>
          <span className="diary-count">
            {collected} / {total} видов
          </span>
        </div>
        <div className="bar diary-bar">
          <div className="bar-fill" style={{ width: `${total ? (collected / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="diary-stats">
        {([['Собрано', totals.collect], ['Посажено', totals.plant], ['Урожаев', totals.harvest]] as const).map(
          ([label, num]) => (
            <div className="diary-stat" key={label}>
              <div className="diary-stat-num">{num}</div>
              <div className="diary-stat-label">{label}</div>
            </div>
          ),
        )}
      </div>

      <div className="diary-chips">
        {CHIPS.map((c) => (
          <button
            key={c.k}
            className={`chip ${filter === c.k ? 'on' : ''}`}
            onClick={() => setFilter(c.k)}
          >
            {c.k !== 'all' && <span className="chip-dot" style={{ background: RARITY_COLOR[c.k] }} />}
            {c.l}
          </button>
        ))}
      </div>

      <div className="diary-grid">
        {shown.map((e) => {
          const qty = qtyByType[e.seed_type] ?? 0;
          const have = discovered.has(e.seed_type); // собирал когда-либо
          return (
            <div key={e.seed_type} className={`diary-tile ${have ? '' : 'locked'}`}>
              <div className="diary-art">
                <span className="diary-circle" style={have ? rarityStyle(e.rarity) : undefined}>
                  <img src={seedImage(e.seed_type)} alt="" />
                </span>
                {!have ? (
                  <span className="diary-lock">
                    <LockIcon size={12} />
                  </span>
                ) : qty > 0 ? (
                  <span className="diary-badge">×{qty}</span>
                ) : null}
              </div>
              <div className="diary-name">{have ? e.name : '???'}</div>
              <div
                className="diary-rarity"
                style={{ color: have ? RARITY_COLOR[e.rarity] : 'var(--soil-300)' }}
              >
                {RARITY_LABEL[e.rarity]}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chart-box diary-chart">
        <div className="diary-chart-head">
          <h4>Активность · 7 дней</h4>
          <div className="diary-legend">
            <span>
              <i style={{ background: COLLECT_FILL }} />Сбор
            </span>
            <span>
              <i style={{ background: HARVEST_FILL }} />Урожай
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dayData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="collect" name="Сбор" fill={COLLECT_FILL} radius={[6, 6, 0, 0]} />
            <Bar dataKey="harvest" name="Урожай" fill={HARVEST_FILL} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="diary-logout">
        <button className="outline block" onClick={() => void supabase.auth.signOut()}>
          <LogoutIcon size={18} /> Выйти
        </button>
      </div>
    </div>
  );
}
