import { useState } from 'react';
import type { FormEvent } from 'react';

import { supabase } from '../../lib/supabase';

type Mode = 'in' | 'up';

export function Login() {
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    const { error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setBusy(false);
    if (error) {
      setError(error.message);
    } else if (mode === 'up') {
      // если в Supabase включено подтверждение email — сессии ещё нет
      setInfo('Готово! Если включено подтверждение email — проверь почту, иначе войди.');
      setMode('in');
    }
    // при успешном входе сессию подхватит onAuthStateChange в App
  }

  return (
    <div className="centered">
      <form className="card" onSubmit={submit}>
        <h1>🌱 Piter-Go</h1>
        <p className="muted">Ферма по Санкт-Петербургу</p>

        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="пароль (мин. 6 символов)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={6}
          required
        />

        <button type="submit" disabled={busy}>
          {busy ? '…' : mode === 'in' ? 'Войти' : 'Зарегистрироваться'}
        </button>

        {error && <p className="error">{error}</p>}
        {info && <p className="info">{info}</p>}

        <button
          type="button"
          className="link"
          onClick={() => setMode(mode === 'in' ? 'up' : 'in')}
        >
          {mode === 'in' ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
        </button>
      </form>
    </div>
  );
}
