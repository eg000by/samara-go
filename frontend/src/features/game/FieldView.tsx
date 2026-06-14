import { useEffect, useState } from 'react';

import { ClockIcon, PlusIcon } from '../../components/icons';
import { rarityStyle, seedImage } from '../../lib/seeds';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  expandField,
  fetchCatalog,
  fetchField,
  fetchInventory,
  harvestAllReady,
  harvestCell,
  plantSeed,
} from './gameSlice';

function fmt(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function FieldView() {
  const dispatch = useAppDispatch();
  const field = useAppSelector((s) => s.game.field);
  const fetchedAt = useAppSelector((s) => s.game.fieldFetchedAt);
  const catalog = useAppSelector((s) => s.game.catalog);
  const inventory = useAppSelector((s) => s.game.inventory);
  const profile = useAppSelector((s) => s.auth.profile);

  const side = profile?.field_side ?? 3;
  const cost = profile?.expand_cost ?? null;
  const currency = profile?.currency ?? 0;
  const maxed = cost === null;
  const canAfford = cost !== null && currency >= cost;

  const [, setTick] = useState(0);
  const [planting, setPlanting] = useState<number | null>(null);

  useEffect(() => {
    void dispatch(fetchCatalog());
    void dispatch(fetchField());
    void dispatch(fetchInventory());
  }, [dispatch]);

  // тик раз в секунду — живой отсчёт роста без перезапросов к серверу
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = fetchedAt ? (Date.now() - fetchedAt) / 1000 : 0;

  // пересчёт состояния клетки с учётом «живого» времени
  function compute(cell: (typeof field)[number]) {
    if (cell.empty || !cell.seed_type) return { state: 'empty' as const };
    const grow = catalog[cell.seed_type]?.grow_seconds ?? 0;
    const remaining = Math.max(0, cell.seconds_left - elapsed);
    const progress = grow > 0 ? Math.min(1, (grow - remaining) / grow) : cell.progress;
    const ready = remaining <= 0;
    return { state: ready ? ('ready' as const) : ('growing' as const), remaining, progress, seedType: cell.seed_type, name: cell.name };
  }

  const readyIndexes = field.filter((c) => compute(c).state === 'ready').map((c) => c.cell_index);

  return (
    <div className="field-screen">
      <div className="field-titlerow">
        <h2>Моё поле</h2>
        <span className="field-sub">
          {side} × {side} грядки
        </span>
      </div>

      <div className="clay-bed">
        <div className="soil-well" style={{ gridTemplateColumns: `repeat(${side}, 1fr)` }}>
          {field.map((cell) => {
            const c = compute(cell);
            if (c.state === 'empty') {
              return (
                <button
                  key={cell.cell_index}
                  className="plot empty"
                  onClick={() => setPlanting(cell.cell_index)}
                  aria-label="Посадить"
                >
                  <span className="plot-add">
                    <PlusIcon size={18} />
                  </span>
                </button>
              );
            }
            if (c.state === 'ready') {
              return (
                <button
                  key={cell.cell_index}
                  className="plot ready"
                  onClick={() => void dispatch(harvestCell(cell.cell_index))}
                  aria-label="Собрать"
                >
                  <span className="plot-glow" />
                  <img className="crop ripe" src={seedImage(c.seedType!)} alt="" />
                  <span className="plot-badge">готово</span>
                </button>
              );
            }
            return (
              <div key={cell.cell_index} className="plot growing">
                <img className="crop" src={seedImage(c.seedType!)} alt="" />
                <span className="plot-timer">
                  <ClockIcon size={12} /> {fmt(c.remaining!)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="field-actions">
        <button
          className="harvest-all"
          disabled={readyIndexes.length === 0}
          onClick={() => void dispatch(harvestAllReady(readyIndexes))}
        >
          Собрать урожай · {readyIndexes.length}
        </button>
        <button
          className="soft expand-btn"
          disabled={maxed || !canAfford}
          title={maxed ? 'Поле максимального размера' : !canAfford ? 'Не хватает монет' : ''}
          onClick={() => void dispatch(expandField())}
        >
          <PlusIcon size={18} /> {maxed ? 'Максимум' : `Грядка · ${cost}`}
        </button>
      </div>
      <p className="field-caption">
        {maxed
          ? 'нажми на спелое растение, чтобы собрать семечко в дневник'
          : 'нажми на спелое растение, чтобы собрать урожай · расширяй грядку за монеты'}
      </p>

      {planting !== null && (
        <div className="picker-backdrop" onClick={() => setPlanting(null)}>
          <div className="picker" onClick={(e) => e.stopPropagation()}>
            <h4>Что посадить?</h4>
            {inventory.length === 0 ? (
              <p className="muted">Инвентарь пуст — собери семена на карте</p>
            ) : (
              inventory.map((i) => (
                <button
                  key={i.seed_type}
                  className="pick-row"
                  onClick={() => {
                    void dispatch(plantSeed({ cellIndex: planting, seedType: i.seed_type }));
                    setPlanting(null);
                  }}
                >
                  <span className="seed-thumb" style={rarityStyle(i.rarity)}>
                    <img src={seedImage(i.seed_type)} alt="" />
                  </span>
                  <span>{i.name}</span>
                  <span className="inv-qty">×{i.qty}</span>
                </button>
              ))
            )}
            <button className="link" onClick={() => setPlanting(null)}>
              отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
