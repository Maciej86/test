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

describe('leave decision notifications', () => {
  const i18n = createI18n();

  it('cancelled leave shows the reason (and no "days returned", which is wrong for types that do not deduct)', () => {
    expect(
      i18n.t('notifications:types.leave_cancelled.detail', { leaveType: 'Okolicznościowy', dateFrom: '14.05.2026', dateTo: '15.05.2026', reason: 'Ślub przełożony.' }),
    ).toBe('Okolicznościowy, 14.05.2026 – 15.05.2026. Powód: Ślub przełożony.');
  });
});
