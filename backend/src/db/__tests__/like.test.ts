import { describe, expect, it } from 'vitest';
import { likePattern } from '../like';

describe('likePattern', () => {
  it('wraps the text in % and escapes %, _ and \\ so they are searched literally', () => {
    expect(likePattern('Kow')).toBe('%Kow%');
    expect(likePattern('50%')).toBe('%50\\%%');
    expect(likePattern('_')).toBe('%\\_%');
    expect(likePattern('a\\b')).toBe('%a\\\\b%');
  });
});
