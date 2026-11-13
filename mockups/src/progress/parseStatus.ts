export const MODULE_STATUSES = ['zrobiony', 'w toku', 'wstrzymany', 'czeka'] as const;
export type ModuleStatus = (typeof MODULE_STATUSES)[number];

export interface StatusModule {
  number: number;
  name: string;
  folder: string;
  status: ModuleStatus;
  stage: string;
  dependsOn: string[];
}

export interface ProjectStatus {
  nextStep: string | null;
  startSteps: { label: string; done: boolean }[];
  modules: StatusModule[];
}

export type ParseResult = { ok: true; status: ProjectStatus } | { ok: false; reason: string };

const NONE = new Set(['', '—', '-', '–']);

function section(lines: string[], title: string): string[] {
  const start = lines.findIndex((l) => l.trim().toLowerCase() === `## ${title}`.toLowerCase());
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('## '));
  return end === -1 ? rest : rest.slice(0, end);
}

function cells(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** Czyta docs/STATUS.md (format z document-templates.md). Nigdy nie rzuca wyjątku. */
export function parseStatus(md: string): ParseResult {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');

  const nextLine = lines.find((l) => l.startsWith('**Następny krok:**'));
  const nextStep = nextLine ? nextLine.replace('**Następny krok:**', '').trim() || null : null;

  const startSteps = section(lines, 'Start aplikacji')
    .map((l) => l.match(/^\s*-\s*\[([ xX])\]\s*(.+)$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => ({ label: m[2].trim(), done: m[1].toLowerCase() === 'x' }));

  const table = section(lines, 'Moduły').filter((l) => l.trim().startsWith('|'));
  const modules: StatusModule[] = [];
  if (table.length > 0) {
    const header = cells(table[0]).map((h) => h.toLowerCase());
    const col = (name: string) => header.indexOf(name);
    const idx = { number: col('#'), name: col('moduł'), folder: col('folder'), status: col('status'), stage: col('etap'), deps: col('zależy od') };
    const missing = Object.entries(idx).filter(([, i]) => i === -1).map(([k]) => k);
    if (missing.length > 0) return { ok: false, reason: `W tabeli modułów brakuje kolumn: ${missing.join(', ')}` };

    for (const row of table.slice(1)) {
      const c = cells(row);
      if (c.every((v) => /^:?-+:?$/.test(v) || v === '')) continue;
      const status = c[idx.status] as ModuleStatus;
      if (!MODULE_STATUSES.includes(status)) {
        return { ok: false, reason: `Nieznany status „${c[idx.status]}” (dozwolone: ${MODULE_STATUSES.join(', ')})` };
      }
      const deps = c[idx.deps] ?? '';
      modules.push({
        number: Number(c[idx.number]),
        name: c[idx.name],
        folder: c[idx.folder],
        status,
        stage: c[idx.stage],
        dependsOn: NONE.has(deps) ? [] : deps.split(',').map((d) => d.trim()).filter(Boolean),
      });
    }
  }
  return { ok: true, status: { nextStep, startSteps, modules } };
}

/**
 * Nazwy modułów, od których zależy `module`, zamiast nazw folderów (dla osoby, która nie programuje).
 * `'all'`, gdy zależy od wszystkich pozostałych (np. Publikacja). Nieznany folder zostaje jak jest.
 */
export function dependencyNames(module: StatusModule, modules: StatusModule[]): string[] | 'all' {
  const others = modules.filter((m) => m.folder !== module.folder);
  if (others.length > 1 && others.every((m) => module.dependsOn.includes(m.folder))) return 'all';
  return module.dependsOn.map((folder) => modules.find((m) => m.folder === folder)?.name ?? folder);
}
