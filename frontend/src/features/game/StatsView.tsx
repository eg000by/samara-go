import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { api } from '../../lib/api';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import type { Rarity, StatsResponse } from '../../types';
import { fetchCatalog, fetchInventory } from './gameSlice';

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export function StatsView() {
  const dispatch = useAppDispatch();
  const inventory = useAppSelector((s) => s.game.inventory);
  const catalog = useAppSelector((s) => s.game.catalog);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    void dispatch(fetchCatalog());
    void dispatch(fetchInventory());
    api.stats().then(setStats).catch(console.error);
  }, [dispatch]);

  // состав инвентаря по редкости (для круговой диаграммы)
  const byRarity = inventory.reduce<Record<string, number>>((acc, item) => {
    const rarity = catalog[item.seed_type]?.rarity ?? 'common';
    acc[rarity] = (acc[rarity] ?? 0) + item.qty;
    return acc;
  }, {});
  const pieData = Object.entries(byRarity).map(([rarity, qty]) => ({ rarity, qty }));

  const dayData = (stats?.by_day ?? []).map((d) => ({ ...d, label: d.day.slice(5) }));

  return (
    <div className="stats-wrap">
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-num">{stats?.totals.collect ?? 0}</span>
          <small className="muted">собрано семян</small>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats?.totals.plant ?? 0}</span>
          <small className="muted">посажено</small>
        </div>
        <div className="stat-card">
          <span className="stat-num">{stats?.totals.harvest ?? 0}</span>
          <small className="muted">урожаев</small>
        </div>
      </div>

      <div className="chart-box">
        <h4>Активность за 7 дней</h4>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dayData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="collect" name="Сбор" fill="#3b82f6" />
            <Bar dataKey="harvest" name="Урожай" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-box">
        <h4>Инвентарь по редкости</h4>
        {pieData.length === 0 ? (
          <p className="muted">Инвентарь пуст</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="qty" nameKey="rarity" outerRadius={90} label>
                {pieData.map((d) => (
                  <Cell key={d.rarity} fill={RARITY_COLOR[d.rarity as Rarity] ?? '#999'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
