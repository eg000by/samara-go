import { expect, test } from '@playwright/test';
import { Client } from 'pg';

// Сквозной сценарий через UI: вход → посадка → урожай.
// «Сбор» семени зависит от геолокации/Leaflet и надёжно покрыт backend-тестами,
// поэтому здесь стартовый инвентарь выдаём через БД, а рост ускоряем сдвигом planted_at.

const SB = process.env.SUPABASE_URL!;
const ANON = process.env.SUPABASE_ANON_KEY!;
const SVC = process.env.SUPABASE_SERVICE_KEY!;
const DB = process.env.DATABASE_URL!;

const email = `e2e-${Date.now()}@example.com`;
const password = 'Test123456!';
let uid = '';

async function db(sql: string, params: unknown[] = []) {
  const client = new Client({ connectionString: DB, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end();
  }
}

const admin = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json' };

test.beforeAll(async () => {
  const res = await fetch(`${SB}/auth/v1/admin/users`, {
    method: 'POST',
    headers: admin,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  uid = (await res.json()).id;
  // профиль создаётся триггером on_auth_user_created; выдаём стартовый инвентарь
  await db(
    `insert into inventory(user_id, seed_type, qty) values($1,'wheat',3)
     on conflict (user_id, seed_type) do update set qty = excluded.qty`,
    [uid],
  );
});

test.afterAll(async () => {
  await db('delete from events where user_id=$1', [uid]);
  await fetch(`${SB}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: { apikey: SVC, Authorization: `Bearer ${SVC}` },
  });
});

test('вход → посадка → урожай', async ({ page }) => {
  // вход
  await page.goto('/');
  await page.getByPlaceholder('email').fill(email);
  await page.getByPlaceholder(/пароль/).fill(password);
  await page.getByRole('button', { name: 'Войти' }).click();

  // игровой экран загрузился
  await expect(page.getByRole('button', { name: /Поле/ })).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: /Поле/ }).click();

  // сажаем пшеницу в первую пустую клетку
  await page.locator('.cell.empty').first().click();
  await page.getByRole('button', { name: /Пшеница/ }).click();
  await expect(page.locator('.cell', { hasText: 'Пшеница' }).first()).toBeVisible();

  // ускоряем рост через БД и перезагружаем
  await db(
    `update field_cells set planted_at = now() - interval '10 min'
     where user_id=$1 and planted_seed_type='wheat'`,
    [uid],
  );
  await page.reload();
  await page.getByRole('button', { name: /Поле/ }).click();

  // собираем урожай → баланс становится 5 (таймаут с запасом на холодный старт Render)
  await page.getByRole('button', { name: 'Собрать' }).first().click();
  await expect(page.locator('.coins')).toContainText('5', { timeout: 45_000 });
});
