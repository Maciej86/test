import { describe, expect, it } from 'vitest';
import { createI18n, translateKey } from '../i18n';

describe('translateKey', () => {
  const i18n = createI18n();

  it('translates a key with its namespace', () => {
    expect(translateKey(i18n.t, 'validation.required')).toBe('To pole jest wymagane.');
  });

  it('fills values sent by the server (e.g. 409 with days and left)', () => {
    expect(translateKey(i18n.t, 'my-leave.server.not_enough_days', { days: 7, left: 3 })).toBe(
      'Za mało dni: wniosek ma 7, a możesz wykorzystać jeszcze 3.',
    );
  });
});
