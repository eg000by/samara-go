import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { BookIcon, CoinIcon, FieldIcon, PinIcon } from '../components/icons';
import { LogoMark } from '../components/Wordmark';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { DiaryView } from './game/DiaryView';
import { FieldView } from './game/FieldView';
import { InventoryRail } from './game/InventoryRail';
import { MapView } from './game/MapView';
import { clearToast } from './game/gameSlice';

type Tab = 'map' | 'field' | 'diary';

const NAV: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: 'map', label: 'Карта', icon: <PinIcon size={20} /> },
  { key: 'field', label: 'Поле', icon: <FieldIcon size={20} /> },
  { key: 'diary', label: 'Дневник', icon: <BookIcon size={20} /> },
];

export function Home() {
  const dispatch = useAppDispatch();
  const profile = useAppSelector((s) => s.auth.profile);
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
    <div className="app-shell">
      <div className="app-content">
        <header className="app-header">
          <LogoMark size={32} />
          {/* монеты прячем на Карте, показываем на Поле и в Дневнике */}
          {tab !== 'map' && (
            <span className="coins-pill">
              <CoinIcon size={18} />
              <span>{(profile?.currency ?? 0).toLocaleString('ru-RU')}</span>
            </span>
          )}
        </header>

        {tab === 'map' && <MapView />}
        {tab === 'field' && (
          <>
            <FieldView />
            <InventoryRail />
          </>
        )}
        {tab === 'diary' && <DiaryView />}
      </div>

      <nav className="bottom-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`bnav-item ${tab === n.key ? 'active' : ''}`}
            onClick={() => setTab(n.key)}
            aria-label={n.label}
          >
            <span className="bnav-icon">{n.icon}</span>
            <span className="bnav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      {(toast || error) && (
        <div className={`toast ${error ? 'toast-error' : ''}`}>{error ?? toast}</div>
      )}
    </div>
  );
}
