import { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchCatalog, fetchField, fetchInventory, harvestCell, plantSeed } from './gameSlice';

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

  return (
    <div className="field-wrap">
      <div className="field-grid">
        {field.map((cell) => {
          if (cell.empty || !cell.seed_type) {
            return (
              <button
                key={cell.cell_index}
                className="cell empty"
                onClick={() => setPlanting(cell.cell_index)}
                title="посадить"
              >
                +
              </button>
            );
          }
          // лениво пересчитываем рост из времени с момента загрузки поля
          const grow = catalog[cell.seed_type]?.grow_seconds ?? 0;
          const remaining = Math.max(0, cell.seconds_left - elapsed);
          const progress = grow > 0 ? Math.min(1, (grow - remaining) / grow) : cell.progress;
          const ready = remaining <= 0;
          return (
            <div key={cell.cell_index} className={`cell ${ready ? 'ready' : ''}`}>
              <b>{cell.name}</b>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              {ready ? (
                <button onClick={() => void dispatch(harvestCell(cell.cell_index))}>Собрать</button>
              ) : (
                <small className="muted">{fmt(remaining)}</small>
              )}
            </div>
          );
        })}
      </div>

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
                  onClick={() => {
                    void dispatch(plantSeed({ cellIndex: planting, seedType: i.seed_type }));
                    setPlanting(null);
                  }}
                >
                  {i.name} ×{i.qty}
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
