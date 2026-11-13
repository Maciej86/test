// Daty, liczby i kwoty tylko przez @app/shared (formatDate, DateText, formatNumber, formatMoney). Przeglądarka i serwer
// formatują po swojemu (np. "8/3/2026" w angielskiej przeglądarce), ręczne składanie dni gubi strefę czasową,
// a toFixed zaokrągla kwoty z błędem. Wyjątek w obliczeniu: na końcu linii komentarz `// format-ok: <powód>`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const OWN_FORMATTING =
  /\.toLocale(Date|Time)?String\(|Intl\.(DateTimeFormat|NumberFormat)|\.get(Full)?Year\(\)|\.getMonth\(\)|\.toFixed\(/;
const ALLOWED = /\/\/ format-ok: \S/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' || name === 'node_modules' ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('formatting', () => {
  const roots = ['src', '../mockups/src', '../backend/src'].map((d) => resolve(process.cwd(), d));
  const files = roots.flatMap(sourceFiles);

  it('finds the source files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s formats dates and numbers only with @app/shared', (file) => {
    const offending = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => OWN_FORMATTING.test(line) && !ALLOWED.test(line));
    expect(offending).toEqual([]);
  });
});
