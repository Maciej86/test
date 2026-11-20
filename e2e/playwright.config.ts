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
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  // Komputer bywa zajęty innymi programami; wtedy zapis z hasłem (szyfrowanie celowo pracochłonne) trwa kilka sekund
  // zamiast ułamka, a przeglądarka rysuje wolniej. Domyślne 5 s na pojawienie się elementu było za krótko
  // (sprawdzone w nagraniu 2026-11-20: zapis pracownika 3,6 s + rysowanie > 1 s).
  timeout: 45_000,
  expect: { timeout: 10_000 },
  // Domyślnie Playwright otwiera tyle przeglądarek, ile połowa wątków procesora (tu 10). Razem z serwerami w trybie
  // deweloperskim to zapychało komputer: kroki trwały po kilka sekund i testy przekraczały czas. 4 kończą w tym
  // samym czasie, bez przeciążenia.
  workers: 4,
  use: { baseURL: FRONTEND },
  projects: [
    // Powiadomienia liczą nieprzeczytane u wspólnego administratora e2e, a inne testy (np. nowy wniosek) dokładają
    // mu nowych. Dlatego idą pierwsze i same, zaraz po seedzie; reszta czeka na ich koniec (gdy one nie przejdą,
    // reszta się nie uruchamia: „did not run”).
    { name: 'notifications', testMatch: 'notifications.spec.ts', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'chromium',
      testIgnore: 'notifications.spec.ts',
      dependencies: ['notifications'],
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    { command: 'npm run dev -w @app/backend', url: `http://localhost:${process.env.PORT ?? 3001}/api/health`, reuseExistingServer: !process.env.CI, cwd: '..' },
    { command: 'npm run dev -w @app/frontend', url: FRONTEND, reuseExistingServer: !process.env.CI, cwd: '..' },
    { command: 'npm run dev -w @app/mockups', url: MOCKUPS, reuseExistingServer: !process.env.CI, cwd: '..' },
  ],
});
