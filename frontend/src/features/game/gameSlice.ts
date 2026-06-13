import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../../lib/api';
import type { InventoryItem, LatLon, SeedOnMap } from '../../types';

interface GameState {
  seeds: SeedOnMap[];
  inventory: InventoryItem[];
  loadingMap: boolean;
  error: string | null;
  toast: string | null; // короткое сообщение после действия
}

const initialState: GameState = {
  seeds: [],
  inventory: [],
  loadingMap: false,
  error: null,
  toast: null,
};

export const fetchMap = createAsyncThunk('game/fetchMap', (pos: LatLon) => api.map(pos));

export const fetchInventory = createAsyncThunk('game/fetchInventory', () => api.inventory());

export const collectSeed = createAsyncThunk(
  'game/collect',
  async (arg: { id: number; pos: LatLon }, { dispatch }) => {
    const res = await api.collect(arg.id, arg.pos);
    void dispatch(fetchInventory()); // инвентарь изменился
    return { id: arg.id, name: res.name };
  },
);

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {
    clearToast(state) {
      state.toast = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMap.pending, (state) => {
        state.loadingMap = true;
      })
      .addCase(fetchMap.fulfilled, (state, action) => {
        state.loadingMap = false;
        state.seeds = action.payload;
      })
      .addCase(fetchMap.rejected, (state, action) => {
        state.loadingMap = false;
        state.error = action.error.message ?? 'Ошибка карты';
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.inventory = action.payload;
      })
      .addCase(collectSeed.fulfilled, (state, action) => {
        // убираем собранное семя с карты сразу, не дожидаясь рефетча
        state.seeds = state.seeds.filter((s) => s.id !== action.payload.id);
        state.toast = `Собрано: ${action.payload.name}`;
      })
      .addCase(collectSeed.rejected, (state, action) => {
        state.error = action.error.message ?? 'Не удалось собрать';
      });
  },
});

export const { clearToast } = gameSlice.actions;
export default gameSlice.reducer;
