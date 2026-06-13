import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// мокаем Supabase — компонент не должен ходить в сеть
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { Login } from './Login';

describe('Login', () => {
  it('по умолчанию показывает форму входа', () => {
    render(<Login />);
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  it('переключается в режим регистрации', async () => {
    render(<Login />);
    await userEvent.click(screen.getByRole('button', { name: /Нет аккаунта/ }));
    expect(screen.getByRole('button', { name: 'Зарегистрироваться' })).toBeInTheDocument();
  });
});
