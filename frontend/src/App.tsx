import { useEffect } from 'react';

import { Login } from './features/auth/Login';
import { Home } from './features/Home';
import { supabase } from './lib/supabase';
import { loadProfile, signedOut } from './store/authSlice';
import { useAppDispatch, useAppSelector } from './store/hooks';

export default function App() {
  const dispatch = useAppDispatch();
  const status = useAppSelector((s) => s.auth.status);

  useEffect(() => {
    // 1) восстановить сессию при загрузке
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) void dispatch(loadProfile());
      else dispatch(signedOut());
    });
    // 2) реагировать на вход/выход
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) void dispatch(loadProfile());
      else dispatch(signedOut());
    });
    return () => sub.subscription.unsubscribe();
  }, [dispatch]);

  if (status === 'loading') return <div className="centered muted">Загрузка…</div>;
  if (status === 'signedOut') return <Login />;
  return <Home />;
}
