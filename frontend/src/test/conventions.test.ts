// Testy zasad (docs/CONVENTIONS.md, „Testy zasad”). Plik stepkit: nie zmieniaj go. Czerwony test = popraw kod.
// Wyjątek w uzasadnionym miejscu: na końcu linii komentarz `// rule-ok: <powód>` (przegląd kodu sprawdza powód).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED = /\/\/ rule-ok: \S/;
const src = resolve(process.cwd(), 'src');
const modulesDir = join(src, 'modules');

function files(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : files(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const lines = (text: string, test: (line: string) => boolean) =>
  text.split('\n').flatMap((l, i) => (test(l) && !ALLOWED.test(l) ? [i + 1] : []));

/** 8. Zapytanie poza wspólnym klientem `api`. */
export const ownHttpClient = (text: string) => lines(text, (l) => /\bfetch\(|from ['"]axios['"]/.test(l));

/** 9. Ekran modułu woła `api` sam zamiast przez hooki z `<module>.api.ts`. */
export const apiOutsideHooks = (text: string) =>
  lines(text, (l) => /import\s*\{[^}]*\bapi\b[^}]*\}\s*from\s*['"][^'"]*core\/api\/client['"]/.test(l));

/** 10. Import z folderu innego modułu (wspólne idzie do common/ albo core/). */
export function importFromOtherModule(text: string, file: string): number[] {
  const own = relative(modulesDir, file).split(sep)[0];
  return lines(text, (l) => {
    const m = /from\s+['"](\.[^'"]*)['"]/.exec(l);
    if (!m) return false;
    const target = relative(modulesDir, resolve(dirname(file), m[1]!));
    return !target.startsWith('..') && target.split(sep)[0] !== own;
  });
}

/** 11. Dymek z pominięciem `notify`. */
export const ownNotifications = (text: string) => lines(text, (l) => /notifications\.show|from ['"]@mantine\/notifications['"]/.test(l));

/** Treść pliku bez komentarzy (z zachowaniem numerów linii). */
function withoutComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/(?! rule-ok:).*$/gm, '$1');
}
/** 12. Polski tekst wpisany w kod zamiast klucza i18n. */
export const polishTextInCode = (text: string) => lines(withoutComments(text), (l) => /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(l));

/** 13. Własne wyrażenie regularne w schemacie modułu zamiast gotowego pola z shared/src/schemas/fields.ts. */
export const ownRegex = (text: string) => lines(text, (l) => /\.regex\(/.test(l));

describe('convention checks catch violations', () => {
  it('8. own HTTP client', () => {
    expect(ownHttpClient("const r = await fetch('/api/x');")).toEqual([1]);
    expect(ownHttpClient("import axios from 'axios';")).toEqual([1]);
    expect(ownHttpClient("import { useClients } from './clients.api';")).toEqual([]);
  });

  it('9. api used outside module hooks', () => {
    expect(apiOutsideHooks("import { api } from '../../core/api/client';")).toEqual([1]);
    expect(apiOutsideHooks("import { apiErrorMessage } from '../../core/api/client';")).toEqual([]);
  });

  it('10. imports from another module', () => {
    const file = join(modulesDir, 'orders', 'OrdersListPage.tsx');
    expect(importFromOtherModule("import { X } from '../clients/ClientsTable';", file)).toEqual([1]);
    expect(importFromOtherModule("import { X } from './components/OrdersTable';", file)).toEqual([]);
    expect(importFromOtherModule("import { InfoCard } from '../../common/InfoCard';", file)).toEqual([]);
  });

  it('11. notifications without notify', () => {
    expect(ownNotifications('notifications.show({ message })')).toEqual([1]);
    expect(ownNotifications('notify.success(t("saved"))')).toEqual([]);
  });

  it('13. own regular expressions in module schemas', () => {
    expect(ownRegex("zip: z.string().regex(/^\\d{2}-\\d{3}$/, 'x'),")).toEqual([1]);
    expect(ownRegex('zip: postalCode,')).toEqual([]);
  });

  it('12. Polish text in code', () => {
    expect(polishTextInCode('<Button>Zapisz zmiany i wyjdź</Button>')).toEqual([1]);
    expect(polishTextInCode('/** Lista zamówień */\n<Button>{t("save")}</Button> // zapis')).toEqual([]);
  });
});

describe('frontend follows the conventions', () => {
  const all = files(src);
  const modules = files(modulesDir);
  const read = (f: string) => readFileSync(f, 'utf8');
  const name = (f: string) => relative(src, f);

  it('finds the files to check', () => {
    expect(all.length).toBeGreaterThan(10);
  });

  it.each(all.filter((f) => !f.includes(join('core', 'api'))).map(name))(
    '%s: requests only through api from core/api/client.ts',
    (f) => expect(ownHttpClient(read(join(src, f)))).toEqual([]),
  );

  it.each(modules.filter((f) => !f.endsWith('.api.ts')).map(name))('%s: data through <module>.api.ts hooks', (f) => {
    expect(apiOutsideHooks(read(join(src, f)))).toEqual([]);
  });

  it.each(modules.map(name))('%s: no imports from other modules', (f) => {
    expect(importFromOtherModule(read(join(src, f)), join(src, f))).toEqual([]);
  });

  it.each(modules.map(name))('%s: notifications through notify', (f) => {
    expect(ownNotifications(read(join(src, f)))).toEqual([]);
  });

  it.each(modules.map(name))('%s: texts in shared/locales, not in code', (f) => {
    expect(polishTextInCode(read(join(src, f)))).toEqual([]);
  });

  it('shared/src/schemas: module schemas take formats only from fields.ts', () => {
    const dir = resolve(process.cwd(), '../shared/src/schemas');
    const offending = readdirSync(dir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !['fields.ts', 'list.ts'].includes(f))
      .flatMap((f) => ownRegex(readFileSync(join(dir, f), 'utf8')).map((line) => `${f}:${line}`));
    expect(offending).toEqual([]);
  });
});
