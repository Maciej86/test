// Testy zasad (docs/CONVENTIONS.md, „Testy zasad”). Plik stepkit: nie zmieniaj go. Czerwony test = popraw kod.
// Wyjątek w uzasadnionym miejscu: na końcu linii komentarz `// rule-ok: <powód>` (przegląd kodu sprawdza powód).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ALLOWED = /\/\/ rule-ok: \S/;
const root = resolve(__dirname, '..');

function files(dir: string, pattern: RegExp): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'node_modules' || name === 'test' ? [] : files(path, pattern);
    return pattern.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}
const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

/** 1. Wartość wklejona w tekst zapytania SQL zamiast `?`. */
export function sqlInterpolation(text: string): number[] {
  const found: number[] = [];
  for (const m of text.matchAll(/\.(query|execute)(<[^>]*>)?\(\s*`([^`]*)`/g)) {
    if (!m[3]!.includes('${')) continue;
    const start = lineOf(text, m.index!);
    const end = lineOf(text, m.index! + m[0].length);
    const lines = text.split('\n').slice(start - 1, end);
    if (!lines.some((l) => ALLOWED.test(l))) found.push(start);
  }
  return found;
}

/** 2. Ręczna transakcja zamiast withTransaction. */
export function manualTransaction(text: string): number[] {
  return text
    .split('\n')
    .flatMap((l, i) => (/\b(getConnection|beginTransaction)\(/.test(l) && !ALLOWED.test(l) ? [i + 1] : []));
}

/** 3. Trasa zapisu bez validateBody. */
export function writeRouteWithoutValidation(text: string): number[] {
  const starts = [...text.matchAll(/\.(get|post|put|patch|delete)\(\s*['"`]/g)];
  return starts.flatMap((m, i) => {
    if (!['post', 'put', 'patch'].includes(m[1]!)) return [];
    const segment = text.slice(m.index!, starts[i + 1]?.index ?? text.length);
    return segment.includes('validateBody(') || ALLOWED.test(segment) ? [] : [lineOf(text, m.index!)];
  });
}

const IDENTITY = '(userId|user_id|role|companyId|company_id|createdBy|created_by|ownerId|owner_id)';
/** 4. Tożsamość lub rola wzięta z treści żądania zamiast z req.user. */
export function identityFromBody(text: string): number[] {
  const patterns = [
    new RegExp(`req\\.body\\.${IDENTITY}\\b`),
    new RegExp(`\\{[^}]*\\b${IDENTITY}\\b[^}]*\\}\\s*=\\s*req\\.body`),
  ];
  return text
    .split('\n')
    .flatMap((l, i) => (patterns.some((p) => p.test(l)) && !ALLOWED.test(l) ? [i + 1] : []));
}

/** 5. Moduł podpięty za logowaniem bez mountModule. */
export function mountedWithoutMountModule(appText: string): number[] {
  const lines = appText.split('\n');
  const auth = lines.findIndex((l) => /api\.use\(requireAuth\)/.test(l));
  if (auth < 0) return [0];
  return lines.flatMap((l, i) =>
    i > auth && /\bapi\.use\(/.test(l) && !/api\.use\(options\.extraRoutes\)/.test(l) && !ALLOWED.test(l)
      ? [i + 1]
      : [],
  );
}

/** 7. Klucz obcy bez reguły ON DELETE. */
export function foreignKeyWithoutOnDelete(sql: string): number[] {
  const found: number[] = [];
  for (const m of sql.matchAll(/REFERENCES\s+`?\w+`?\s*\([^)]*\)([^,;]*)/gi)) {
    if (!/ON\s+DELETE/i.test(m[1]!)) found.push(lineOf(sql, m.index!));
  }
  return found;
}

describe('convention checks catch violations', () => {
  it('1. SQL with a value pasted into the text', () => {
    expect(sqlInterpolation('pool.query(`SELECT * FROM t WHERE id = ${id}`)')).toEqual([1]);
    expect(sqlInterpolation("pool.query('SELECT * FROM t WHERE id = ?', [id])")).toEqual([]);
    expect(sqlInterpolation('pool.query(`SELECT * FROM t ORDER BY ${sort}`) // rule-ok: kolumna z listQuerySchema')).toEqual([]);
  });

  it('2. manual transactions', () => {
    expect(manualTransaction('const conn = await pool.getConnection();')).toEqual([1]);
    expect(manualTransaction('await withTransaction(async (conn) => {});')).toEqual([]);
  });

  it('3. write routes without validateBody', () => {
    expect(writeRouteWithoutValidation("r.post('/x', async (req, res) => {});")).toEqual([1]);
    expect(writeRouteWithoutValidation("r.post('/x', validateBody(s), async (req, res) => {});\nr.get('/y', h);")).toEqual([]);
  });

  it('4. identity from the request body', () => {
    expect(identityFromBody('const owner = req.body.userId;')).toEqual([1]);
    expect(identityFromBody('const { name, role } = req.body;')).toEqual([1]);
    expect(identityFromBody('const owner = req.user!.id;')).toEqual([]);
  });

  it('5. modules mounted without mountModule', () => {
    const app = "api.use(health);\napi.use(requireAuth);\nmountModule(api, 'orders', ordersRoutes);\napi.use('/x', xRoutes);";
    expect(mountedWithoutMountModule(app)).toEqual([4]);
  });

  it('7. foreign keys without ON DELETE', () => {
    expect(foreignKeyWithoutOnDelete('FOREIGN KEY (a) REFERENCES users (id),\nb INT')).toEqual([1]);
    expect(foreignKeyWithoutOnDelete('FOREIGN KEY (a) REFERENCES users (id) ON DELETE SET NULL\n) ENGINE=InnoDB;')).toEqual([]);
  });
});

describe('backend follows the conventions', () => {
  const sources = files(root, /\.ts$/);
  const routes = files(join(root, 'modules'), /\.routes\.ts$/);
  const migrations = [...files(resolve(root, '../migrations'), /\.sql$/), ...files(join(root, 'db/sql'), /\.sql$/)];
  const read = (f: string) => readFileSync(f, 'utf8');
  const name = (f: string) => relative(resolve(root, '..'), f);

  it('finds the files to check', () => {
    expect(sources.length).toBeGreaterThan(5);
    expect(routes.length).toBeGreaterThan(0);
  });

  it.each(sources.map(name))('%s: SQL only with ? parameters', (f) => {
    expect(sqlInterpolation(read(resolve(root, '..', f)))).toEqual([]);
  });

  it.each(sources.filter((f) => !f.endsWith(join('db', 'transaction.ts'))).map(name))(
    '%s: transactions only through withTransaction',
    (f) => expect(manualTransaction(read(resolve(root, '..', f)))).toEqual([]),
  );

  it.each(routes.map(name))('%s: every write route has validateBody', (f) => {
    expect(writeRouteWithoutValidation(read(resolve(root, '..', f)))).toEqual([]);
  });

  it.each(sources.map(name))('%s: who and which role come from req.user, not from the body', (f) => {
    expect(identityFromBody(read(resolve(root, '..', f)))).toEqual([]);
  });

  it('app.ts: modules behind login are mounted with mountModule', () => {
    expect(mountedWithoutMountModule(read(join(root, 'app.ts')))).toEqual([]);
  });

  it.each(routes.map(name))('%s: has a test next to it that checks 401 and 403', (f) => {
    const text = read(resolve(root, '..', f));
    if (ALLOWED.test(text)) return;
    const test = join(dirname(resolve(root, '..', f)), basename(f).replace(/\.ts$/, '.test.ts'));
    expect(existsSync(test), `brak pliku ${basename(test)}`).toBe(true);
    const testText = read(test);
    expect(testText).toContain('401');
    expect(testText).toContain('403');
  });

  it.each(migrations.map(name))('%s: every foreign key has ON DELETE', (f) => {
    expect(foreignKeyWithoutOnDelete(read(resolve(root, '..', f)))).toEqual([]);
  });
});

/** Foldery modułów oznaczonych w docs/STATUS.md jako `zrobiony`. */
export function doneModuleFolders(status: string): string[] {
  return status
    .split('\n')
    .map((l) => l.split('|').map((c) => c.trim()))
    .filter((c) => c.length > 5 && /^\d+$/.test(c[1]!) && c[4] === 'zrobiony')
    .map((c) => c[3]!);
}

/** Szkielet testu z planu (`it.todo`), którego nie zamieniono na prawdziwy test. */
export const leftTodos = (text: string) =>
  text.split('\n').flatMap((l, i) => (/\b(it|test)\.todo\(/.test(l) ? [i + 1] : []));

describe('finished modules have no test placeholders', () => {
  it('reads finished modules from STATUS.md and finds placeholders', () => {
    const status = '| # | Moduł | Folder | Status |\n|---|---|---|---|\n| 1 | Wygląd | appearance | zrobiony | — |\n| 2 | Klienci | clients | w toku | plan |';
    expect(doneModuleFolders(status)).toEqual(['appearance']);
    expect(leftTodos("it.todo('POST /clients: złe dane → 400');\nit('x', () => {});")).toEqual([1]);
  });

  const project = resolve(root, '../..');
  const statusFile = join(project, 'docs/STATUS.md');
  const done = existsSync(statusFile) ? doneModuleFolders(readFileSync(statusFile, 'utf8')) : [];
  const allFiles = (dir: string): string[] =>
    !existsSync(dir)
      ? []
      : statSync(dir).isFile()
        ? [dir]
        : readdirSync(dir).flatMap((n) => (n === 'node_modules' ? [] : allFiles(join(dir, n))));

  it.skipIf(done.length === 0).each(done)('module %s: every it.todo from the plan became a real test', (folder) => {
    const places = [
      join(project, 'backend/src/modules', folder),
      join(project, 'frontend/src/modules', folder),
      join(project, 'shared/src/schemas', `${folder}.test.ts`),
      join(project, 'e2e', `${folder}.spec.ts`),
    ];
    const offending = places
      .flatMap(allFiles)
      .flatMap((f) => leftTodos(readFileSync(f, 'utf8')).map((line) => `${relative(project, f)}:${line}`));
    expect(offending).toEqual([]);
  });
});
