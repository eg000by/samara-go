import { describe, expect, it } from 'vitest';

import type { UserProfile } from '../types';
import reducer, { loadProfile, setCurrency, setFieldInfo, signedOut } from './authSlice';

const profile: UserProfile = { id: 'u1', username: 'tester', currency: 10, plots_unlocked: 3, expand_cost: 10 };
const init = () => reducer(undefined, { type: '@@INIT' });

describe('authSlice', () => {
  it('loadProfile.fulfilled переводит в signedIn с профилем', () => {
    const next = reducer(init(), { type: loadProfile.fulfilled.type, payload: profile });
    expect(next.status).toBe('signedIn');
    expect(next.profile).toEqual(profile);
  });

  it('setCurrency обновляет баланс активного профиля', () => {
    const signed = reducer(init(), { type: loadProfile.fulfilled.type, payload: profile });
    const next = reducer(signed, setCurrency(42));
    expect(next.profile?.currency).toBe(42);
  });

  it('setFieldInfo обновляет баланс, число открытых клеток и цену', () => {
    const signed = reducer(init(), { type: loadProfile.fulfilled.type, payload: profile });
    const next = reducer(signed, setFieldInfo({ currency: 0, plots_unlocked: 4, expand_cost: 10 }));
    expect(next.profile?.plots_unlocked).toBe(4);
    expect(next.profile?.currency).toBe(0);
    expect(next.profile?.expand_cost).toBe(10);
  });

  it('signedOut очищает профиль', () => {
    const signed = reducer(init(), { type: loadProfile.fulfilled.type, payload: profile });
    const next = reducer(signed, signedOut());
    expect(next.status).toBe('signedOut');
    expect(next.profile).toBeNull();
  });
});
