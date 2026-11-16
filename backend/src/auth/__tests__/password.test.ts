import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../password';

describe('passwords', () => {
  it('hashPassword returns a hash that is not the password', async () => {
    const hash = await hashPassword('Urlop-2026');
    expect(hash).not.toContain('Urlop-2026');
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
  });

  it('verifyPassword accepts the right password and rejects a wrong one', async () => {
    const hash = await hashPassword(' Zażółć-1 ');
    expect(await verifyPassword(' Zażółć-1 ', hash)).toBe(true);
    expect(await verifyPassword('Zażółć-1', hash)).toBe(false);
  });
});
