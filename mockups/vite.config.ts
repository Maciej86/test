import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Porty i inne ustawienia z pliku .env w głównym folderze projektu (jeśli istnieje).
try {
  process.loadEnvFile(new URL('../.env', import.meta.url));
} catch {
  // brak .env: wartości domyślne
}

export default defineConfig({
  plugins: [react()],
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
