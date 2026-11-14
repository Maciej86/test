import { describe, it } from 'vitest';

describe('ChangePasswordPage', () => {
  it.todo('different passwords show an error under repeat');
  it.todo('a weak password shows password_rules');
  it.todo('server error password_same_as_temporary shows under new password');
  it.todo('success shows the saved notification and goes to /admin');
  it.todo('without a temporary password goes to /admin');
  it.todo('has a logout link');
});
