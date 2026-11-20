import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Porty i inne ustawienia z pliku .env w głównym folderze projektu (jeśli istnieje).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // brak .env: wartości domyślne
}

/** Strona „Postęp” czyta ../docs/STATUS.md spoza folderu makiet: bez tego serwer nie widzi zmian statusu. */
const watchStatus = (): Plugin => ({
  name: 'watch-status',
  configureServer: (server) => {
    server.watcher.add(fileURLToPath(new URL('../docs/STATUS.md', import.meta.url)));
  },
});

export default defineConfig({
  plugins: [react(), watchStatus()],
  build: { chunkSizeWarningLimit: 2000 },
  server: {
    // Port można zmienić zmienną MOCKUPS_PORT, gdy 5174 jest zajęty przez inny program.
    port: Number(process.env.MOCKUPS_PORT ?? 5174),
    strictPort: true,
    // Strona „Postęp” czyta ../docs/STATUS.md.
    fs: { allow: ['..'] },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
