import { describe, it } from 'vitest';

describe('idle logout', () => {
  it.todo('shows no warning at 28:59 and the warning with 60 s at 29:00');
  it.todo('logs out with reason idle at 30:00');
  it.todo('stay logged in closes the warning and pings /auth/me with the activity header');
  it.todo('mouse movement does not close the open warning');
  it.todo('activity in another tab postpones the warning');
});
