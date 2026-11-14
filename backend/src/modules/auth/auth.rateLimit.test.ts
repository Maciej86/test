import { describe, it } from 'vitest';

describe('login rate limit', () => {
  it.todo('11th failed login in 15 minutes returns 429 too_many_logins');
  it.todo('successful logins do not use up the limit');
});
