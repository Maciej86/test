import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Przed testami: losowe hasło (nigdzie niezapisane) i konta testowe e2e.admin / e2e.employee w lokalnej bazie.
 * Hasło trafia do testów przez process.env.E2E_PASSWORD. Wymaga bazy (npm run db) i tabel (npm run migrate).
 */
const globalSetup = () => {
  const password = `E2e-${randomBytes(9).toString('base64url')}7`;
  process.env.E2E_PASSWORD = password;
  execFileSync('npm', ['run', 'seed:e2e', '-w', '@app/backend'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, E2E_PASSWORD: password },
    stdio: 'inherit',
  });
};
export default globalSetup;
