import { defineConfig, devices } from '@playwright/test';

// Porty i inne ustawienia z pliku .env w głównym folderze projektu (jeśli istnieje).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // brak .env: wartości domyślne
}

const FRONTEND = `http://localhost:${process.env.FRONTEND_PORT ?? 5173}`;
const MOCKUPS = `http://localhost:${process.env.MOCKUPS_PORT ?? 5174}`;
export const urls = { FRONTEND, MOCKUPS };

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  use: { baseURL: FRONTEND },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'npm run dev -w @app/backend', url: `http://localhost:${process.env.PORT ?? 3001}/api/health`, reuseExistingServer: !process.env.CI, cwd: '..' },
    { command: 'npm run dev -w @app/frontend', url: FRONTEND, reuseExistingServer: !process.env.CI, cwd: '..' },
    { command: 'npm run dev -w @app/mockups', url: MOCKUPS, reuseExistingServer: !process.env.CI, cwd: '..' },
  ],
});
