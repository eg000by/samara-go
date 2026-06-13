/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // дефолтные env для тестов — чтобы Supabase-клиент не падал на импорте без .env
    env: {
      VITE_API_URL: 'http://localhost:8000',
      VITE_SUPABASE_URL: 'http://localhost',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
