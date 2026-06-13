import { useEffect, useState } from 'react';

import { api, ApiError } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAppSelector } from '../store/hooks';
import type { CatalogEntry } from '../types';

const RARITY_COLOR: Record<string, string> = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export function Home() {
  const profile = useAppSelector((s) => s.auth.profile);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .catalog()
      .then(setCatalog)
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : 'Не удалось загрузить каталог'),
      );
  }, []);

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

      <main className="content">
        <p className="muted">
          Карта и поле появятся на следующих шагах. Пока — справочник семян:
        </p>
        {error && <p className="error">{error}</p>}
        <div className="seed-grid">
          {catalog.map((s) => (
            <div key={s.seed_type} className="seed-card">
              <span
                className="rarity-dot"
                style={{ background: RARITY_COLOR[s.rarity] ?? '#999' }}
              />
              <b>{s.name}</b>
              <small className="muted">{s.rarity}</small>
              <small>рост: {Math.round(s.grow_seconds / 60)} мин · 🪙 {s.reward}</small>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
