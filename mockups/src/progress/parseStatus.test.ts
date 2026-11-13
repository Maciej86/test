import { dependencyNames, parseStatus, type StatusModule } from './parseStatus';

const FULL = `# Stan projektu: Sklep

**Następny krok:** Dokończyć logowanie.

## Start aplikacji

- [x] 1. Sprawdzenie komputera
- [ ] 2. Szkielet i repo

## Moduły

| # | Moduł | Folder | Status | Etap | Zależy od |
|---|---|---|---|---|---|
| 1 | Logowanie | login | w toku | implementacja (krok 3/7) | — |
| 2 | Klienci | clients | czeka | makieta | login, orders |

## Ostatnie decyzje

- 2026-11-11: coś
`;

describe('parseStatus', () => {
  it('reads next step, start steps and modules', () => {
    const result = parseStatus(FULL);
    if (!result.ok) throw new Error(result.reason);
    expect(result.status.nextStep).toBe('Dokończyć logowanie.');
    expect(result.status.startSteps).toEqual([
      { label: '1. Sprawdzenie komputera', done: true },
      { label: '2. Szkielet i repo', done: false },
    ]);
    expect(result.status.modules[0]).toEqual({
      number: 1,
      name: 'Logowanie',
      folder: 'login',
      status: 'w toku',
      stage: 'implementacja (krok 3/7)',
      dependsOn: [],
    });
    expect(result.status.modules[1].dependsOn).toEqual(['login', 'orders']);
  });

  it('gives the same result for Windows line endings', () => {
    expect(parseStatus(FULL.replace(/\n/g, '\r\n'))).toEqual(parseStatus(FULL));
  });

  it('accepts a file without modules yet', () => {
    const result = parseStatus('# Stan projektu: X\n\n**Następny krok:** Start.\n');
    expect(result).toEqual({ ok: true, status: { nextStep: 'Start.', startSteps: [], modules: [] } });
  });

  it('rejects an unknown status and names it', () => {
    const result = parseStatus(FULL.replace('| czeka |', '| w trakcie |'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('w trakcie');
  });

  it('ignores an extra column at the end', () => {
    const extra = FULL.replace('| Zależy od |', '| Zależy od | Uwagi |')
      .replace('|---|---|---|---|---|---|', '|---|---|---|---|---|---|---|')
      .replace('| — |', '| — | pilne |');
    const result = parseStatus(extra);
    if (!result.ok) throw new Error(result.reason);
    expect(result.status.modules[0].dependsOn).toEqual([]);
    expect(result.status.modules).toHaveLength(2);
  });

  it('reads the template STATUS.md shipped with the project', async () => {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const text = await readFile(resolve(process.cwd(), '../docs/STATUS.md'), 'utf8');
    expect(parseStatus(text).ok).toBe(true);
  });
});

describe('dependencyNames', () => {
  const mod = (number: number, name: string, folder: string, dependsOn: string[] = []): StatusModule => ({
    number, name, folder, status: 'czeka', stage: 'makieta', dependsOn,
  });
  const modules = [
    mod(1, 'Wygląd', 'appearance'),
    mod(2, 'Logowanie', 'login', ['appearance']),
    mod(3, 'Dni wolne firmy', 'days-off', ['login', 'reports']),
    mod(4, 'Publikacja', 'deploy', ['appearance', 'login', 'days-off']),
  ];

  it('shows module names instead of folders', () => {
    expect(dependencyNames(modules[1], modules)).toEqual(['Wygląd']);
    expect(dependencyNames(modules[0], modules)).toEqual([]);
  });

  it('keeps an unknown folder as it is', () => {
    expect(dependencyNames(modules[2], modules)).toEqual(['Logowanie', 'reports']);
  });

  it('says "all" when a module depends on every other one', () => {
    expect(dependencyNames(modules[3], modules)).toBe('all');
  });
});
