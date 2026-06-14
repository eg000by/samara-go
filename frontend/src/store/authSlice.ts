import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { api } from '../lib/api';
import type { UserProfile } from '../types';

type Status = 'loading' | 'signedIn' | 'signedOut';

interface AuthState {
  status: Status;
  profile: UserProfile | null;
}

const initialState: AuthState = { status: 'loading', profile: null };

// /me возвращает профиль и пишет событие login.
export const loadProfile = createAsyncThunk('auth/loadProfile', () => api.me());

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedOut(state) {
      state.status = 'signedOut';
      state.profile = null;
    },
    // баланс меняется после сбора урожая — держим его в стор актуальным
    setCurrency(state, action: PayloadAction<number>) {
      if (state.profile) state.profile.currency = action.payload;
    },
    // после расширения грядки: новый баланс + размер + цена след. расширения
    setFieldInfo(state, action: PayloadAction<{ currency: number; field_side: number; expand_cost: number | null }>) {
      if (state.profile) {
        state.profile.currency = action.payload.currency;
        state.profile.field_side = action.payload.field_side;
        state.profile.expand_cost = action.payload.expand_cost;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadProfile.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadProfile.fulfilled, (state, action) => {
        state.status = 'signedIn';
        state.profile = action.payload;
      })
      .addCase(loadProfile.rejected, (state) => {
        state.status = 'signedOut';
        state.profile = null;
      });
  },
});

export const { signedOut, setCurrency, setFieldInfo } = authSlice.actions;
export default authSlice.reducer;
