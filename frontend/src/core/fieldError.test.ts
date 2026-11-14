import { i18n } from '../test/render';
import { fieldError } from './fieldError';

describe('fieldError', () => {
  it('translates a key from the schema or the server', () => {
    expect(fieldError(i18n.t, 'validation.required')).toBe('To pole jest wymagane.');
  });

  it('no key → no error', () => {
    expect(fieldError(i18n.t, undefined)).toBeUndefined();
    expect(fieldError(i18n.t, '')).toBeUndefined();
  });
});
