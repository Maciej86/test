/** Zmyślone wpisy historii zmian do makiety. Najnowsze na górze. */

export const AREAS = ['leave_requests', 'leave_pools', 'tasks', 'projects', 'users'] as const;
export type Area = (typeof AREAS)[number];

/** Rodzaj zmiany decyduje o kolorze ikony: zatwierdzenie zielone, odrzucenie i usunięcie czerwone. */
export type Tone = 'neutral' | 'positive' | 'negative' | 'muted';

export interface MockChange {
  /** Klucz pola z `activity-log.json` → `fields`. */
  field: string;
  before: string | null;
  after: string | null;
}

export interface MockEntry {
  id: number;
  at: string;
  who: string;
  area: Area;
  /** Klucz z `activity-log.json` → `actions`. */
  action: string;
  tone: Tone;
  /** Czego dotyczy: osoba, zadanie, projekt. Zapamiętane w chwili zmiany. */
  target: string;
  detail?: string;
  changes: MockChange[];
  /** Rekord już nie istnieje (np. projekt usunięty na stałe razem z zadaniami). */
  deleted?: boolean;
  /** Rekord jest w archiwum: przycisk prowadzi do Archiwum. */
  archived?: boolean;
}

export const ENTRIES: MockEntry[] = [
  {
    id: 412, at: '2026-11-19T14:08:00', who: 'Anna Nowak', area: 'leave_requests', action: 'approve', tone: 'positive',
    target: 'Magdalena Lewandowska', detail: 'wypoczynkowy, 22.12–31.12.2026, 6 dni',
    changes: [{ field: 'status', before: 'Czeka', after: 'Zatwierdzony' }],
  },
  {
    id: 411, at: '2026-11-19T13:51:00', who: 'Jan Kowalski', area: 'tasks', action: 'move', tone: 'neutral',
    target: 'Przygotować ofertę dla hurtowni Lewiatan', detail: 'projekt Marketing',
    changes: [{ field: 'column', before: 'W opracowaniu', after: 'W toku' }],
  },
  {
    id: 410, at: '2026-11-19T11:30:00', who: 'Anna Nowak', area: 'leave_requests', action: 'reject', tone: 'negative',
    target: 'Piotr Zieliński', detail: 'na żądanie, 20.11.2026, 1 dzień',
    changes: [
      { field: 'status', before: 'Czeka', after: 'Odrzucony' },
      { field: 'reason', before: null, after: 'W piątek odbiór zamówienia z Kaufland, potrzebny cały magazyn.' },
    ],
  },
  {
    id: 409, at: '2026-11-19T09:12:00', who: 'Katarzyna Wiśniewska', area: 'tasks', action: 'update', tone: 'neutral',
    target: 'Zamówić tonery do drukarek', detail: 'projekt Produkcja',
    changes: [
      { field: 'due_date', before: '21.11.2026', after: '26.11.2026' },
      { field: 'assignees', before: 'Katarzyna Wiśniewska', after: 'Katarzyna Wiśniewska, Tomasz Wójcik' },
    ],
  },
  {
    id: 408, at: '2026-11-19T08:04:00', who: 'Piotr Zieliński', area: 'leave_requests', action: 'create', tone: 'neutral',
    target: 'Piotr Zieliński', detail: 'na żądanie, 20.11.2026, 1 dzień',
    changes: [
      { field: 'leave_type', before: null, after: 'Na żądanie' },
      { field: 'dates', before: null, after: '20.11.2026' },
      { field: 'working_days', before: null, after: '1 (z puli rocznej)' },
    ],
  },
  {
    id: 407, at: '2026-11-18T16:40:00', who: 'Anna Nowak', area: 'projects', action: 'delete', tone: 'negative',
    target: 'Targi Poznań 2026', deleted: true,
    changes: [
      { field: 'name', before: 'Targi Poznań 2026', after: null },
      { field: 'deleted_tasks', before: null, after: '7' },
    ],
  },
  {
    id: 406, at: '2026-11-18T15:22:00', who: 'Tomasz Wójcik', area: 'tasks', action: 'archive', tone: 'negative',
    target: 'Spotkanie z dostawcą palet', detail: 'projekt Montaż', archived: true,
    changes: [],
  },
  {
    id: 405, at: '2026-11-18T12:10:00', who: 'Anna Nowak', area: 'leave_pools', action: 'pool_update', tone: 'neutral',
    target: 'Katarzyna Wiśniewska', detail: 'rok 2026',
    changes: [
      { field: 'annual_days', before: '20', after: '26' },
      { field: 'carried_days', before: '3', after: '5' },
    ],
  },
  {
    id: 404, at: '2026-11-18T10:47:00', who: 'Marek Nowicki', area: 'tasks', action: 'finish', tone: 'positive',
    target: 'Wymienić uszczelki w prasie nr 2', detail: 'projekt Produkcja',
    changes: [{ field: 'finished', before: 'nie', after: 'tak' }],
  },
  {
    id: 403, at: '2026-11-18T09:03:00', who: 'Magdalena Lewandowska', area: 'leave_requests', action: 'withdraw', tone: 'muted',
    target: 'Magdalena Lewandowska', detail: 'okolicznościowy, 27.11–28.11.2026, 2 dni',
    changes: [{ field: 'status', before: 'Czeka', after: 'Wycofany' }],
  },
  {
    id: 402, at: '2026-11-17T17:15:00', who: 'Anna Nowak', area: 'users', action: 'user_create', tone: 'positive',
    target: 'Ewa Kamińska', detail: 'pracownik',
    changes: [
      { field: 'login', before: null, after: 'ewa.kaminska@firma.pl' },
      { field: 'role', before: null, after: 'Pracownik' },
      { field: 'annual_days', before: null, after: '26' },
    ],
  },
  {
    id: 401, at: '2026-11-17T17:15:00', who: 'Anna Nowak', area: 'users', action: 'password', tone: 'neutral',
    target: 'Piotr Zieliński',
    changes: [],
  },
  {
    id: 400, at: '2026-11-17T14:32:00', who: 'Anna Nowak', area: 'projects', action: 'project_update', tone: 'neutral',
    target: 'Montaż',
    changes: [{ field: 'members', before: 'Tomasz Wójcik, Marek Nowicki', after: 'Tomasz Wójcik, Marek Nowicki, Ewa Kamińska' }],
  },
  {
    id: 399, at: '2026-11-17T11:05:00', who: 'Anna Nowak', area: 'leave_requests', action: 'cancel', tone: 'negative',
    target: 'Jan Kowalski', detail: 'wypoczynkowy, 01.12–05.12.2026, 5 dni',
    changes: [
      { field: 'status', before: 'Zatwierdzony', after: 'Anulowany' },
      { field: 'reason', before: null, after: 'Przesunięty termin audytu, uzgodnione telefonicznie.' },
    ],
  },
  {
    id: 398, at: '2026-11-17T08:20:00', who: 'Anna Nowak', area: 'users', action: 'role', tone: 'neutral',
    target: 'Tomasz Wójcik',
    changes: [{ field: 'role', before: 'Pracownik', after: 'Administrator' }],
  },
];

export const PEOPLE = [...new Set(ENTRIES.map((e) => e.who))].sort((a, b) => a.localeCompare(b, 'pl'));

/** Liczba wszystkich wpisów w makiecie (do numerów stron). */
export const TOTAL_ENTRIES = 412;
