// Kolory tylko z motywu (shared/src/theme.ts), nigdy wpisane na sztywno: dzięki temu działa ciemny motyw,
// a zmiana kolorów aplikacji to jedna zmiana w motywie.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const HARDCODED = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('colors', () => {
  const roots = ['src', '../mockups/src'].map((d) => resolve(process.cwd(), d));
  const files = roots.flatMap(sourceFiles);

  it('finds the source files to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it.each(files)('%s uses theme colors only', (file) => {
    const offending = readFileSync(file, 'utf8')
      .split('\n')
      .filter((line) => HARDCODED.test(line));
    expect(offending).toEqual([]);
  });
});
