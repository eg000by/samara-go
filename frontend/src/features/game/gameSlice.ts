import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { api } from '../../lib/api';
import { setCurrency, setFieldInfo } from '../../store/authSlice';
import type { CatalogEntry, FieldCell, InventoryItem, LatLon, SeedOnMap } from '../../types';

interface GameState {
  seeds: SeedOnMap[];
  inventory: InventoryItem[];
  catalog: Record<string, CatalogEntry>;
  field: FieldCell[];
  fieldFetchedAt: number; // для живого отсчёта роста на клиенте
  loadingMap: boolean;
  error: string | null;
  toast: string | null; // короткое сообщение после действия
}

const initialState: GameState = {
  seeds: [],
  inventory: [],
  catalog: {},
  field: [],
  fieldFetchedAt: 0,
  loadingMap: false,
  error: null,
  toast: null,
};

export const fetchMap = createAsyncThunk('game/fetchMap', (pos: LatLon) => api.map(pos));

export const fetchInventory = createAsyncThunk('game/fetchInventory', () => api.inventory());

export const fetchCatalog = createAsyncThunk('game/fetchCatalog', () => api.catalog());

export const fetchField = createAsyncThunk('game/fetchField', () => api.field());

export const plantSeed = createAsyncThunk(
  'game/plant',
  async (arg: { cellIndex: number; seedType: string }, { dispatch }) => {
    await api.plant(arg.cellIndex, arg.seedType);
    void dispatch(fetchField());
    void dispatch(fetchInventory());
  },
);

export const harvestCell = createAsyncThunk(
  'game/harvest',
  async (cellIndex: number, { dispatch }) => {
    const res = await api.harvest(cellIndex);
    dispatch(setCurrency(res.currency)); // обновляем баланс в шапке
    void dispatch(fetchField());
    return res;
  },
);

export const harvestAllReady = createAsyncThunk(
  'game/harvestAll',
  async (indexes: number[], { dispatch }) => {
    let count = 0;
    for (const i of indexes) {
      const res = await api.harvest(i);
      dispatch(setCurrency(res.currency));
      count += 1;
    }
    void dispatch(fetchField());
    return count;
  },
);

export const expandField = createAsyncThunk('game/expand', async (_: void, { dispatch }) => {
  const res = await api.expandField();
  dispatch(setFieldInfo({ currency: res.currency, field_side: res.field_side, expand_cost: res.expand_cost }));
  void dispatch(fetchField());
  return res;
});

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
      .addCase(fetchCatalog.fulfilled, (state, action) => {
        state.catalog = Object.fromEntries(action.payload.map((c) => [c.seed_type, c]));
      })
      .addCase(fetchField.fulfilled, (state, action) => {
        state.field = action.payload;
        state.fieldFetchedAt = Date.now();
      })
      .addCase(plantSeed.fulfilled, (state) => {
        state.toast = 'Посажено 🌱';
      })
      .addCase(plantSeed.rejected, (state, action) => {
        state.error = action.error.message ?? 'Не удалось посадить';
      })
      .addCase(harvestCell.fulfilled, (state, action) => {
        state.toast = `Урожай! +${action.payload.reward} 🪙`;
      })
      .addCase(harvestCell.rejected, (state, action) => {
        state.error = action.error.message ?? 'Не удалось собрать урожай';
      })
      .addCase(harvestAllReady.fulfilled, (state, action) => {
        if (action.payload > 0) state.toast = `Урожай собран! 🌾 ×${action.payload}`;
      })
      .addCase(expandField.fulfilled, (state) => {
        state.toast = 'Грядка расширена! 🌱';
      })
      .addCase(expandField.rejected, (state, action) => {
        state.error = action.error.message ?? 'Не удалось расширить';
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
