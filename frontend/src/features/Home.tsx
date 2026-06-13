import { useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { FieldView } from './game/FieldView';
import { MapView } from './game/MapView';
import { clearToast } from './game/gameSlice';

type Tab = 'map' | 'field';

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
        <strong>🌱 Piter-Go</strong>
        <span className="muted">{profile?.username ?? 'игрок'}</span>
        <span className="coins">🪙 {profile?.currency ?? 0}</span>
        <button className="link" onClick={() => void supabase.auth.signOut()}>
          выйти
        </button>
      </header>

      <nav className="tabs">
        <button className={tab === 'map' ? 'active' : ''} onClick={() => setTab('map')}>
          🗺️ Карта
        </button>
        <button className={tab === 'field' ? 'active' : ''} onClick={() => setTab('field')}>
          🌾 Поле
        </button>
      </nav>

      <main className="content game-layout">
        {tab === 'map' ? <MapView /> : <FieldView />}

        <aside className="inventory">
          <h3>Инвентарь</h3>
          {inventory.length === 0 ? (
            <p className="muted">Пусто — собери семена на карте</p>
          ) : (
            <ul className="inv-list">
              {inventory.map((i) => (
                <li key={i.seed_type}>
                  <span>{i.name}</span>
                  <b>×{i.qty}</b>
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
