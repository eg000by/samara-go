// Типы ответов API — зеркало Pydantic-схем бэкенда (backend/app/schemas.py).

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface UserProfile {
  id: string;
  username: string | null;
  currency: number;
  plots_unlocked: number; // сколько клеток поля 3×3 открыто (3..9)
  expand_cost: number | null; // цена открытия следующей клетки; null если все открыты
}

export interface ExpandResult {
  currency: number;
  plots_unlocked: number;
  expand_cost: number | null;
}

export interface CatalogEntry {
  seed_type: string;
  name: string;
  rarity: Rarity;
  spawn_weight: number;
  grow_seconds: number;
  reward: number;
}

export interface SeedOnMap {
  id: number;
  seed_type: string;
  name: string;
  rarity: Rarity;
  lat: number;
  lon: number;
  dist_m: number;
  can_collect: boolean;
}

export interface CollectResult {
  seed_type: string;
  name: string;
  qty: number;
}

export interface InventoryItem {
  seed_type: string;
  name: string;
  rarity: Rarity;
  qty: number;
}

export interface FieldCell {
  cell_index: number;
  empty: boolean;
  locked: boolean; // клетка ещё не открыта
  seed_type: string | null;
  name: string | null;
  stage: number; // 0..4, 4 = спелое
  progress: number; // 0..1
  ready: boolean;
  seconds_left: number;
}

export interface HarvestResult {
  cell_index: number;
  seed_type: string;
  reward: number;
  currency: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface StatsTotals {
  collect: number;
  plant: number;
  harvest: number;
}

export interface DailyStat {
  day: string; // YYYY-MM-DD
  collect: number;
  harvest: number;
}

export interface StatsResponse {
  totals: StatsTotals;
  by_day: DailyStat[];
}
