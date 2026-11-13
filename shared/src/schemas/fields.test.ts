import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createI18n, translateKey } from '../i18n';
import {
  FIELD_MESSAGES,
  email,
  iban,
  money,
  nip,
  optionalField,
  pesel,
  phone,
  postalCode,
  quantity,
  regon,
  text,
} from './fields';

const ok = (schema: z.ZodType, value: unknown) => schema.parse(value);
const error = (schema: z.ZodType, value: unknown) => schema.safeParse(value).error?.issues[0]?.message;

describe('text', () => {
  it('trims and keeps values from 1 to max characters', () => {
    expect(ok(text(5), '  abc  ')).toBe('abc');
    expect(ok(text(5), 'a')).toBe('a');
    expect(ok(text(5), 'abcde')).toBe('abcde');
  });

  it('rejects empty and too long values', () => {
    expect(error(text(5), '   ')).toBe('validation.required');
    expect(error(text(5), 'abcdef')).toBe('validation.too_long');
  });
});

describe('postalCode', () => {
  it('accepts NN-NNN and adds the dash to five digits', () => {
    expect(ok(postalCode, '64-300')).toBe('64-300');
    expect(ok(postalCode, ' 64300 ')).toBe('64-300');
  });

  it('rejects other formats', () => {
    expect(error(postalCode, '6430')).toBe('validation.postal_code');
    expect(error(postalCode, '64-3000')).toBe('validation.postal_code');
    expect(error(postalCode, 'ab-cde')).toBe('validation.postal_code');
  });
});

describe('nip', () => {
  it('accepts a valid NIP and removes dashes and spaces', () => {
    expect(ok(nip, '526-000-12-46')).toBe('5260001246');
    expect(ok(nip, 'PL 5260001246')).toBe('5260001246');
  });

  it('rejects a wrong checksum or length', () => {
    expect(error(nip, '5260001247')).toBe('validation.nip');
    expect(error(nip, '526000124')).toBe('validation.nip');
  });
});

describe('regon', () => {
  it('accepts valid 9 and 14 digit numbers', () => {
    expect(ok(regon, '012345675')).toBe('012345675');
    expect(ok(regon, '12345678512347')).toBe('12345678512347');
  });

  it('rejects a wrong checksum', () => {
    expect(error(regon, '012345678')).toBe('validation.regon');
  });
});

describe('pesel', () => {
  it('accepts a valid PESEL', () => {
    expect(ok(pesel, '44051401359')).toBe('44051401359');
  });

  it('rejects a wrong checksum or length', () => {
    expect(error(pesel, '44051401358')).toBe('validation.pesel');
    expect(error(pesel, '4405140135')).toBe('validation.pesel');
  });
});

describe('phone', () => {
  it('removes spaces, dashes and brackets', () => {
    expect(ok(phone, '600 100 200')).toBe('600100200');
    expect(ok(phone, '+48 (61) 100-20-30')).toBe('+48611002030');
  });

  it('rejects too short numbers and letters', () => {
    expect(error(phone, '600 100')).toBe('validation.phone');
    expect(error(phone, 'abc')).toBe('validation.phone');
  });
});

describe('email', () => {
  it('trims and lowercases', () => {
    expect(ok(email, ' Jan.Kowalski@Firma.PL ')).toBe('jan.kowalski@firma.pl');
  });

  it('rejects a value without @', () => {
    expect(error(email, 'jan')).toBe('validation.email_invalid');
  });
});

describe('iban', () => {
  it('accepts a Polish account number with or without PL and spaces', () => {
    expect(ok(iban, '61 1090 1014 0000 0712 1981 2874')).toBe('61109010140000071219812874');
    expect(ok(iban, 'PL61109010140000071219812874')).toBe('61109010140000071219812874');
  });

  it('rejects a wrong checksum', () => {
    expect(error(iban, '62109010140000071219812874')).toBe('validation.iban');
  });
});

describe('money', () => {
  it('accepts 0 to the DECIMAL(12,2) maximum with two decimal places', () => {
    expect(ok(money, 0)).toBe(0);
    expect(ok(money, 12.34)).toBe(12.34);
    expect(ok(money, 9_999_999_999.99)).toBe(9_999_999_999.99);
  });

  it('rejects negative, too large, too precise and empty values', () => {
    expect(error(money, -0.01)).toBe('validation.min');
    expect(error(money, 10_000_000_000)).toBe('validation.max');
    expect(error(money, 1.234)).toBe('validation.money');
    expect(error(money, '')).toBe('validation.required');
  });
});

describe('quantity', () => {
  it('accepts three decimal places', () => {
    expect(ok(quantity, 1.125)).toBe(1.125);
  });

  it('rejects negative and too precise values', () => {
    expect(error(quantity, -1)).toBe('validation.min');
    expect(error(quantity, 1.0001)).toBe('validation.quantity');
  });
});

describe('optionalField', () => {
  const schema = z.object({ nip: optionalField(nip) });

  it('turns an empty form value into null', () => {
    expect(schema.parse({ nip: '  ' })).toEqual({ nip: null });
    expect(schema.parse({})).toEqual({ nip: null });
  });

  it('still checks a filled value', () => {
    expect(schema.parse({ nip: '5260001246' })).toEqual({ nip: '5260001246' });
    expect(schema.safeParse({ nip: '123' }).success).toBe(false);
  });
});

describe('field messages', () => {
  const i18n = createI18n();
  it.each(Object.values(FIELD_MESSAGES))('%s has a Polish text', (key) => {
    expect(translateKey(i18n.t, key)).not.toBe(key.split('.').slice(1).join('.'));
  });
});
