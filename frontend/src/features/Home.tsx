import { useEffect, useState } from 'react';

import { Wordmark } from '../components/Wordmark';
import { rarityStyle, seedImage } from '../lib/seeds';
import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { FieldView } from './game/FieldView';
import { MapView } from './game/MapView';
import { StatsView } from './game/StatsView';
import { clearToast } from './game/gameSlice';

type Tab = 'map' | 'field' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'map', label: 'Карта' },
  { key: 'field', label: 'Поле' },
  { key: 'stats', label: 'Дневник' },
];

export function Home() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.auth.profile);
  const inventory = useAppSelector((s) => s.game.inventory);
  const toast = useAppSelector((s) => s.game.toast);
  const error = useAppSelector((s) => s.game.error);
  const [tab, setTab] = useState<Tab>('map');

  // автоскрытие тостов
  useEffect(() => {
    if (!toast && !error) return;
    const t = setTimeout(() => dispatch(clearToast()), 2500);
    return () => clearTimeout(t);
  }, [toast, error, dispatch]);

  return (
    <div className="page">
      <header className="topbar">
        <Wordmark />
        <div className="who">
          <b>{profile?.username ?? 'Садовод'}</b>
          <small>играет</small>
        </div>
        <span className="coins">🪙 {(profile?.currency ?? 0).toLocaleString('ru-RU')}</span>
        <button className="link" onClick={() => void supabase.auth.signOut()}>
          выйти
        </button>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="game-layout">
        {tab === 'map' && <MapView />}
        {tab === 'field' && <FieldView />}
        {tab === 'stats' && <StatsView />}

        <aside className="inventory">
          <h3>Инвентарь</h3>
          {inventory.length === 0 ? (
            <p className="muted">Пусто — собери семена на карте 🌱</p>
          ) : (
            <ul className="inv-list">
              {inventory.map((i) => (
                <li key={i.seed_type}>
                  <span className="seed-thumb" style={rarityStyle(i.rarity)}>
                    <img src={seedImage(i.seed_type)} alt="" />
                  </span>
                  <span className="inv-name">{i.name}</span>
                  <span className="inv-qty">×{i.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>

      {(toast || error) && (
        <div className={`toast ${error ? 'toast-error' : ''}`}>{error ?? toast}</div>
      )}
    </div>
  );
}
