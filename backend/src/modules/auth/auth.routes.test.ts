import { describe, it } from 'vitest';

describe('auth routes', () => {
  it.todo('POST /auth/login with good data returns the user without password_hash and sets the cookie');
  it.todo('POST /auth/login with a wrong password returns 401 login_failed');
  it.todo('POST /auth/login with an unknown login compares against the dummy hash and returns 401 login_failed');
  it.todo('POST /auth/login looks the login up in lower case');
  it.todo('POST /auth/login with empty fields returns 400 with field keys');
  it.todo('POST /auth/logout clears the cookie');
  it.todo('GET /auth/me without login returns 401');
  it.todo('GET /auth/me returns the logged-in user with mustChangePassword');
  it.todo('POST /auth/change-password without a temporary password returns 409');
  it.todo('POST /auth/change-password with the same password returns 400 password_same_as_temporary');
  it.todo('POST /auth/change-password saves the new password and clears the flag');
});
