import { defineConfig, devices } from '@playwright/test';

// e2e гоняет реальный стек: локальный фронт (npm run dev) → прод-бэкенд → Supabase.
// Нужны env: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, DATABASE_URL.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
