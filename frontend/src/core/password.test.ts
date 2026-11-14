import { newPassword } from '@app/shared';
import { generateTemporaryPassword } from './password';

describe('generateTemporaryPassword', () => {
  it('100 generated passwords all pass newPassword and differ', () => {
    const passwords = Array.from({ length: 100 }, generateTemporaryPassword);
    for (const p of passwords) expect(newPassword.safeParse(p).success, p).toBe(true);
    expect(new Set(passwords).size).toBe(100);
  });
});
