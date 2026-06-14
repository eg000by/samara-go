import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';

import {
  ArrowRightIcon,
  AtIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from '../../components/icons';
import { Wordmark } from '../../components/Wordmark';
import { supabase } from '../../lib/supabase';

type Mode = 'in' | 'up';

// Сила пароля 0..4 — длина, регистр, цифра, спецсимвол.
function strengthOf(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-ZА-Я]/.test(pw) && /[a-zа-я]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^\w\s]/.test(pw)) s++;
  return Math.min(s, 4);
}
const STR_LABEL = ['', 'слабый', 'средний', 'хороший', 'надёжный'];
const STR_TONE = [
  'var(--soil-200)',
  'var(--danger)',
  'var(--carrot-500)',
  'var(--green-400)',
  'var(--green-500)',
];

type FieldProps = {
  label: string;
  iconLeft: ReactNode;
  iconRight?: ReactNode;
  hint?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

// Поле ввода в стиле дизайн-системы: подпись, иконка слева, опциональная
// иконка/кнопка справа, подсказка или ошибка под полем.
function Field({ label, iconLeft, iconRight, hint, error, ...input }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className={`field-control ${error ? 'has-error' : ''}`}>
        <span className="field-icon left">{iconLeft}</span>
        <input className="field-input" {...input} />
        {iconRight && <span className="field-icon right">{iconRight}</span>}
      </span>
      {error ? (
        <span className="field-msg error">{error}</span>
      ) : hint ? (
        <span className="field-msg">{hint}</span>
      ) : null}
    </label>
  );
}

export function Login() {
  const [mode, setMode] = useState<Mode>('up');
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isUp = mode === 'up';
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const emailErr = email.length > 0 && !emailOk ? 'Проверь адрес почты' : undefined;
  const nickOk = nick.trim().length >= 3;
  const str = strengthOf(pw);
  const ready = isUp ? nickOk && emailOk && pw.length >= 8 && agree : emailOk && pw.length >= 6;

  function swap(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);

    const { error } = isUp
      ? await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            // ссылка подтверждения возвращает на текущий домен, а не на localhost
            emailRedirectTo: window.location.origin,
            // никнейм уезжает в user_metadata → бэкенд берёт его при создании профиля
            data: { username: nick.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({ email, password: pw });

    setBusy(false);
    if (error) {
      setError(error.message);
    } else if (isUp) {
      setInfo('Готово! Если включено подтверждение email — проверь почту, иначе войди.');
      setMode('in');
    }
    // при успешном входе сессию подхватит onAuthStateChange в App
  }

  const eyeBtn = (
    <button
      type="button"
      className="field-eye"
      onClick={() => setShow((v) => !v)}
      aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
    >
      {show ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
    </button>
  );

  const okMark = (
    <span className="field-ok">
      <CheckIcon size={20} />
    </span>
  );

  return (
    <div className="auth-screen">
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-head">
          <Wordmark markSize={44} />
          <h1 className="auth-title">{isUp ? 'Создать аккаунт' : 'С возвращением'}</h1>
          <p className="auth-sub">
            {isUp
              ? 'Заведи садовода и начни собирать урожай'
              : 'Войди и продолжай собирать город'}
          </p>
        </div>

        <div className="auth-fields">
          {isUp && (
            <Field
              label="Никнейм"
              placeholder="garden_hero"
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              iconLeft={<AtIcon size={20} />}
              iconRight={nickOk ? okMark : undefined}
              hint="Минимум 3 символа — его увидят соседи по карте"
              autoComplete="username"
            />
          )}

          <Field
            label="Почта"
            type="email"
            placeholder="you@example.ru"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            iconLeft={<MailIcon size={20} />}
            iconRight={emailOk ? okMark : undefined}
            error={emailErr}
            autoComplete="email"
          />

          <div>
            <Field
              label="Пароль"
              type={show ? 'text' : 'password'}
              placeholder="••••••••"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              iconLeft={<LockIcon size={20} />}
              iconRight={eyeBtn}
              autoComplete={isUp ? 'new-password' : 'current-password'}
            />
            {isUp && (
              <div className="strength">
                <div className="strength-bars">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="strength-seg"
                      style={{ background: i <= str ? STR_TONE[str] : 'var(--soil-200)' }}
                    />
                  ))}
                </div>
                <span
                  className="strength-label"
                  style={{ color: pw ? STR_TONE[str] : 'var(--text-muted)' }}
                >
                  {pw ? STR_LABEL[str] : '8+ симв.'}
                </span>
              </div>
            )}
          </div>

          {isUp && (
            <label className="terms">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span className="terms-box" aria-hidden>
                {agree && <CheckIcon size={14} />}
              </span>
              <span className="terms-text">
                Принимаю <a href="#">условия</a> и{' '}
                <a href="#">политику конфиденциальности</a>
              </span>
            </label>
          )}

          <button type="submit" className="block" disabled={!ready || busy}>
            {busy ? '…' : isUp ? 'Создать аккаунт' : 'Войти'}
            {!busy && <ArrowRightIcon size={20} />}
          </button>
        </div>

        {error && <p className="error auth-msg">{error}</p>}
        {info && <p className="info auth-msg">{info}</p>}

        <p className="auth-switch">
          {isUp ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
          <button type="button" className="link-inline" onClick={() => swap(isUp ? 'in' : 'up')}>
            {isUp ? 'Войти' : 'Регистрация'}
          </button>
        </p>
      </form>
    </div>
  );
}
