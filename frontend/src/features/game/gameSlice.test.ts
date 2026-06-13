import { describe, expect, it } from 'vitest';

import type { InventoryItem, SeedOnMap } from '../../types';
import reducer, { clearToast, collectSeed, fetchInventory } from './gameSlice';

const seed = (id: number): SeedOnMap => ({
  id,
  seed_type: 'wheat',
  name: 'Пшеница',
  rarity: 'common',
  lat: 0,
  lon: 0,
  dist_m: 0,
  can_collect: true,
});

const init = () => reducer(undefined, { type: '@@INIT' });

describe('gameSlice', () => {
  it('убирает собранное семя с карты и ставит тост', () => {
    const state = { ...init(), seeds: [seed(1), seed(2)] };
    const next = reducer(state, {
      type: collectSeed.fulfilled.type,
      payload: { id: 1, name: 'Пшеница' },
    });
    expect(next.seeds.map((s) => s.id)).toEqual([2]);
    expect(next.toast).toContain('Пшеница');
  });

  it('сохраняет инвентарь', () => {
    const inv: InventoryItem[] = [
      { seed_type: 'wheat', name: 'Пшеница', rarity: 'common', qty: 3 },
    ];
    const next = reducer(init(), { type: fetchInventory.fulfilled.type, payload: inv });
    expect(next.inventory).toEqual(inv);
  });

  it('clearToast сбрасывает toast и error', () => {
    const state = { ...init(), toast: 'x', error: 'y' };
    const next = reducer(state, clearToast());
    expect(next.toast).toBeNull();
    expect(next.error).toBeNull();
  });
});
