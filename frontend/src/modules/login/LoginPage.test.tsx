import { describe, it } from 'vitest';

describe('LoginPage', () => {
  it.todo('empty fields show the required message');
  it.todo('401 shows the login_failed message');
  it.todo('429 shows the too_many_logins message');
  it.todo('reason=idle and reason=expired show their messages');
  it.todo('no connection shows an error notification');
  it.todo('after login with a temporary password goes to /change-password, otherwise to /admin');
  it.todo('a logged-in person on /login goes to /admin');
});
