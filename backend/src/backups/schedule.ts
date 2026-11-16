// Harmonogram i rotacja kopii zapasowych: JEDYNE źródło tych reguł. Skrypt scripts/backup/backup.sh pyta tu o rodzaj
// kopii, nazwy plików i termin ochrony, a backend (health.ts) liczy z tego, czy kopia przepadła. Godziny w timerze
// systemd (scripts/backup/app-backup.timer) muszą zgadzać się z BACKUP_SLOTS w .env serwera; zmieniaj je razem.
//
// Plik bez importów i bez składni spoza „usuwania typów”: serwer uruchamia go zwykłym Node 24 w kontenerze
// (`node backend/src/backups/schedule.ts plan`), także gdy aplikacja nie działa.

export type BackupKind = 'intraday' | 'daily' | 'monthly';

export const DEFAULT_BACKUP_SLOTS = ['00:00', '11:00', '16:30'];
/** Ile dni OVH nie pozwoli usunąć pliku (blokada COMPLIANCE). */
export const RETENTION_DAYS: Record<BackupKind, number> = { intraday: 7, daily: 35, monthly: 400 };
const DAY_MS = 24 * 60 * 60 * 1000;
const KINDS = Object.keys(RETENTION_DAYS) as BackupKind[];

const formatter = new Intl.DateTimeFormat('sv-SE', { // format-ok: godzina PL do nazw plików i harmonogramu, nie do wyświetlania; plik bez importów
  timeZone: 'Europe/Warsaw',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Części daty w czasie polskim, niezależnie od strefy serwera. */
export function warsawParts(date: Date) {
  const p = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return { year: p.year!, month: p.month!, day: p.day!, hour: p.hour!, minute: p.minute! };
}

/** „00:00,11:00,16:30” z .env → lista godzin; pusta albo błędna wartość → domyślne godziny. */
export function parseSlots(value: string | undefined): string[] {
  const slots = (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s))
    .sort();
  return slots.length ? slots : DEFAULT_BACKUP_SLOTS;
}

/**
 * Rodzaj wynika z godziny STARTU w czasie polskim. Przebieg nadrabiany po włączeniu serwera (Persistent=true) o 7:14
 * to kopia „w ciągu dnia”, nie nocna: trzymamy ją krócej, bo nocna tego dnia i tak przepadła.
 */
export function backupKind(date: Date): BackupKind {
  const { day, hour } = warsawParts(date);
  if (hour !== '00') return 'intraday';
  return day === '01' ? 'monthly' : 'daily';
}

export function retainUntil(date: Date, kind: BackupKind): Date {
  return new Date(date.getTime() + RETENTION_DAYS[kind] * DAY_MS);
}

/** Klucze plików w OVH: <rodzaj>/<RRRR-MM-DD_GGMM>-db.sql.gz.age i …-files.tar.gz.age. */
export function objectKeys(date: Date, kind: BackupKind) {
  const { year, month, day, hour, minute } = warsawParts(date);
  const stamp = `${kind}/${year}-${month}-${day}_${hour}${minute}`;
  return { db: `${stamp}-db.sql.gz.age`, files: `${stamp}-files.tar.gz.age` };
}

export function kindFromKey(key: string): BackupKind | null {
  const kind = String(key).split('/')[0] as BackupKind;
  return KINDS.includes(kind) ? kind : null;
}

const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

/** Zmienne przebiegu dla backup.sh (linie NAZWA=wartość, bez spacji, więc bash wczyta je przez eval). */
export function planRun(now: Date): string {
  const kind = backupKind(now);
  const keys = objectKeys(now, kind);
  return [
    `KIND=${kind}`,
    `DB_KEY=${keys.db}`,
    `FILES_KEY=${keys.files}`,
    `RETAIN_UNTIL=${iso(retainUntil(now, kind))}`,
    `STARTED_AT=${iso(now).replace('T', '_').replace('Z', '')}`,
  ].join('\n');
}

interface ObjectVersion {
  Key: string;
  VersionId: string;
  LastModified: string;
}

/**
 * Wersje plików w OVH, którym minął termin ochrony (+1 dzień zapasu na rozjazd zegarów). Wejście: JSON z
 * `aws s3api list-object-versions`, wynik: „klucz<TAB>wersja” na linię. Gdyby wyliczenie się pomyliło, OVH i tak
 * odmówi (COMPLIANCE → AccessDenied): to tylko porządki, nie zabezpieczenie.
 */
export function expiredVersions(json: string, now: Date): string {
  const input = JSON.parse(json || '{}') as { Versions?: ObjectVersion[] };
  return (input.Versions ?? [])
    .flatMap((v) => {
      const kind = kindFromKey(v.Key);
      if (!kind) return [];
      const expires = new Date(v.LastModified).getTime() + (RETENTION_DAYS[kind] + 1) * DAY_MS;
      return expires < now.getTime() ? [`${v.Key}\t${v.VersionId}`] : [];
    })
    .join('\n');
}

// Przesunięcie strefy liczymy dla przybliżenia i poprawiamy raz. Godziny kopii nie wypadają w godzinie przestawianej
// (2:00–3:00), więc wynik jest jednoznaczny.
function warsawOffsetMs(date: Date): number {
  const { year, month, day, hour, minute } = warsawParts(date);
  const floored = Math.floor(date.getTime() / 60000) * 60000;
  return Date.UTC(+year, +month - 1, +day, +hour, +minute) - floored;
}

function warsawLocalToDate(year: number, month: number, day: number, hhmm: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number) as [number, number];
  const asUtc = Date.UTC(year, month - 1, day, hour, minute);
  const guess = asUtc - warsawOffsetMs(new Date(asUtc));
  return new Date(asUtc - warsawOffsetMs(new Date(guess)));
}

/**
 * Ostatnia zaplanowana godzina kopii, od której minęło WIĘCEJ niż graceMs. Liczone w dniach kalendarzowych PL, więc
 * dni zmiany czasu (doba 23 h i 25 h) nie przesuwają godzin.
 */
export function lastDueSlot(now: Date, graceMs: number, slots: string[]): Date | null {
  const limit = now.getTime() - graceMs;
  const { year, month, day } = warsawParts(new Date(limit));
  // Dziś i dwa poprzednie dni: z nawiązką, bo najdłuższa przerwa między kopiami to doba.
  for (let back = 0; back <= 2; back += 1) {
    const d = new Date(Date.UTC(+year, +month - 1, +day - back));
    const due = slots
      .map((slot) => warsawLocalToDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), slot))
      .filter((at) => at.getTime() < limit);
    if (due.length) return due.at(-1)!;
  }
  return null;
}

/** Najbliższa godzina kopii po `now` (do napisu „Następna kopia: 16:30”). */
export function nextSlot(now: Date, slots: string[]): string {
  const { hour, minute } = warsawParts(now);
  const current = `${hour}:${minute}`;
  return slots.find((slot) => slot > current) ?? slots[0]!;
}

// Uruchomienie z serwera: `node schedule.ts plan` albo `… | node schedule.ts expired`.
const command = process.argv[2];
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) && command) {
  if (command === 'plan') console.log(planRun(new Date()));
  else if (command === 'expired') {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    const out = expiredVersions(Buffer.concat(chunks).toString('utf8'), new Date());
    if (out) console.log(out);
  } else {
    console.error(`Nieznane polecenie: ${command} (plan albo expired)`);
    process.exit(2);
  }
}
