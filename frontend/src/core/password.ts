/** Litery łatwe do przepisania z kartki (bez l, I, O, 0). */
const CONSONANTS = 'bcdfghjkmnprstwz';
const VOWELS = 'aeiuy';
const SPECIALS = '!#-+';

const pick = (chars: string): string => {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return chars[n! % chars.length]!;
};

/** Kawałek do wymówienia, np. „Toma”. */
const syllables = (): string => {
  const s = pick(CONSONANTS) + pick(VOWELS) + pick(CONSONANTS) + pick(VOWELS);
  return s[0]!.toUpperCase() + s.slice(1);
};

/**
 * Hasło tymczasowe do przekazania pracownikowi, np. „Toma-Rybe-48!”: łatwe do przepisania, zawsze z cyfrą
 * i znakiem specjalnym (spełnia zasady nowego hasła). Losowanie przez crypto, nie Math.random.
 */
export const generateTemporaryPassword = (): string => {
  return `${syllables()}-${syllables()}-${pick('23456789')}${pick('23456789')}${pick(SPECIALS)}`;
};
