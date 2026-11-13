// Każda tabela w kontenerze z przewijaniem w bok (Table.ScrollContainer): na telefonie i w wąskim oknie
// kolumny się nie ściskają, a tabela nie rozpycha strony.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

describe('tables', () => {
  const files = sourceFiles(resolve(process.cwd(), 'src')).filter((f) => /<Table[\s>]/.test(readFileSync(f, 'utf8')));

  it.each(files.length ? files : ['(brak tabel)'])('%s wraps every table in Table.ScrollContainer', (file) => {
    if (file === '(brak tabel)') return;
    const source = readFileSync(file, 'utf8');
    const tables = source.match(/<Table[\s>]/g)?.length ?? 0;
    const containers = source.match(/<Table\.ScrollContainer[\s>]/g)?.length ?? 0;
    expect(containers).toBeGreaterThanOrEqual(tables);
  });
});
