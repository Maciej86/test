import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * Po testach: usuwa konta e2e.tmp.%@test.local i dane z przedrostkiem „E2E ” (projekty, typy urlopów, typy umów),
 * żeby lokalna baza nie rosła. Stałe konta testowe zostają. Kolejność i wzorce: backend/src/scripts/seedE2e.ts.
 */
const globalTeardown = () => {
  execFileSync('npm', ['run', 'cleanup:e2e', '-w', '@app/backend'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: process.env,
    stdio: 'inherit',
  });
};
export default globalTeardown;
