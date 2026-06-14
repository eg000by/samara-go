// Горизонтальный «Инвентарь» под картой (экран Карта). Плитки с глиняными
// овощами в кольце редкости и счётчиком. См. design_handoff_home_map.
import { rarityStyle, seedImage } from '../../lib/seeds';
import { useAppSelector } from '../../store/hooks';

export function InventoryRail() {
  const inventory = useAppSelector((s) => s.game.inventory);
  const catalog = useAppSelector((s) => s.game.catalog);
  const totalKinds = Object.keys(catalog).length;

  return (
    <section className="inv-rail">
      <div className="inv-rail-head">
        <h3>Инвентарь</h3>
        {totalKinds > 0 && (
          <span className="inv-rail-count">
            {inventory.length} / {totalKinds} видов
          </span>
        )}
      </div>

      {inventory.length === 0 ? (
        <p className="muted inv-rail-empty">Пусто — собери семена на карте 🌱</p>
      ) : (
        <div className="inv-rail-track">
          {inventory.map((i) => (
            <div key={i.seed_type} className="inv-tile">
              <div className="inv-tile-art">
                <span className="seed-thumb inv-tile-thumb" style={rarityStyle(i.rarity)}>
                  <img src={seedImage(i.seed_type)} alt="" />
                </span>
                <span className="inv-tile-badge">{i.qty}</span>
              </div>
              <div className="inv-tile-name">{i.name}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
