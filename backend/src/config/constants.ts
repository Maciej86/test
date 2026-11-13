/** Stałe serwera. Zmieniane tylko w kodzie (sekrety i adresy są w .env). */
export const TOKEN_TTL = '7d';
export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const LOGIN_RATE_LIMIT = { windowMs: 15 * 60 * 1000, max: 10 };
export const BCRYPT_COST = 12;
export const PAGE_SIZE = 25;

/** Pliki od użytkowników (backend/src/files/storage.ts). Moduł może przyjmować mniej, nigdy więcej bez decyzji w specu. */
export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 5;
/**
 * Dozwolone typy plików, rozpoznawane po zawartości (pierwszych bajtach), nie po rozszerzeniu ani po tym, co deklaruje
 * przeglądarka. Nowy typ (np. docx) = wpis tutaj z sygnaturą i test w storage.test.ts.
 */
export const UPLOAD_FILE_TYPES = [
  { ext: 'pdf', mime: 'application/pdf', signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { ext: 'png', mime: 'image/png', signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', mime: 'image/jpeg', signature: [0xff, 0xd8, 0xff] },
  { ext: 'webp', mime: 'image/webp', signature: [0x52, 0x49, 0x46, 0x46], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } },
] as const;
