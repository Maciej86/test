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
  // Jeden plik wystarcza małej aplikacji; ostrzeżenie o rozmiarze tylko by straszyło.
  build: { chunkSizeWarningLimit: 2000 },
  server: {
    // Port można zmienić zmienną FRONTEND_PORT, gdy 5173 jest zajęty przez inny program.
    port: Number(process.env.FRONTEND_PORT ?? 5173),
    strictPort: true,
    proxy: { '/api': `http://localhost:${process.env.PORT ?? 3001}` },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
