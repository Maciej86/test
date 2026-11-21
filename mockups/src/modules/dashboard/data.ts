import type { MyLeaveOverview } from '@app/shared';
/**
 * Zmyślone dane makiety Pulpitu. „Dziś” = piątek 20.11.2026. Osoby i projekty jak w makietach Zadań i Wniosków
 * urlopowych; administrator to Anna Nowak, pracownik Jan Kowalski (projekty Marketing i Produkcja).
 */
/** Kolumna tablicy zadania, które nie jest jeszcze zrealizowane. */
export type OpenColumn = 'draft' | 'in_progress';

export const TODAY = '2026-11-20';

/** Ile dni (kalendarzowych, od dziś) pokazuje pasek nieobecności. */
export const ABSENCE_DAYS = 14;

/** Ile wierszy mieści boks, zanim pojawi się „Pokaż wszystkie”. */
export const BOX_LIMIT = 5;

export interface PendingRequest {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  createdAt: string;
}

/** Wnioski czekające na decyzję, od najbliższego terminu urlopu. */
export const PENDING_REQUESTS: PendingRequest[] = [
  { id: 21, employee: 'Jan Kowalski', type: 'Wypoczynkowy', from: '2026-11-26', to: '2026-11-27', days: 2, createdAt: '2026-11-16 09:12' },
  { id: 22, employee: 'Piotr Zieliński', type: 'Okolicznościowy', from: '2026-11-27', to: '2026-11-30', days: 2, createdAt: '2026-11-17 14:03' },
  { id: 24, employee: 'Katarzyna Wiśniewska', type: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-31', days: 7, createdAt: '2026-11-19 08:47' },
];

export type AbsenceStatus = 'approved' | 'pending';

/** Urlopy zatwierdzone i czekające, które zahaczają o najbliższe 2 tygodnie. */
export const ABSENCES: { person: string; from: string; to: string; status: AbsenceStatus }[] = [
  { person: 'Katarzyna Wiśniewska', from: '2026-11-20', to: '2026-11-20', status: 'approved' },
  { person: 'Magdalena Lewandowska', from: '2026-11-23', to: '2026-11-27', status: 'approved' },
  { person: 'Jan Kowalski', from: '2026-11-26', to: '2026-11-27', status: 'pending' },
  { person: 'Piotr Zieliński', from: '2026-11-27', to: '2026-11-30', status: 'pending' },
];

export interface ProjectCounts {
  id: number;
  name: string;
  draft: number;
  inProgress: number;
  overdue: number;
  /** Zrealizowane w ostatnich 30 dniach. */
  doneRecently: number;
}

/** Stan tablic: projekty w kolejności z menu „Zadania”. */
export const PROJECT_COUNTS: ProjectCounts[] = [
  { id: 1, name: 'Marketing', draft: 3, inProgress: 2, overdue: 1, doneRecently: 5 },
  { id: 2, name: 'Produkcja', draft: 4, inProgress: 3, overdue: 2, doneRecently: 6 },
  { id: 3, name: 'Montaż', draft: 1, inProgress: 2, overdue: 0, doneRecently: 3 },
];

export interface DashboardTask {
  id: number;
  title: string;
  project: string;
  projectId: number;
  column: OpenColumn;
  due: string | null;
  assignees: string[];
}

/** Zadania po terminie we wszystkich projektach (dla administratora), od najstarszego terminu. */
export const OVERDUE_TASKS: DashboardTask[] = [
  { id: 7, title: 'Odebrać próbki lakieru od dostawcy', project: 'Produkcja', projectId: 2, column: 'in_progress', due: '2026-11-13', assignees: ['Tomasz Wójcik'] },
  { id: 3, title: 'Przygotować ofertę dla hurtowni Lewiatan', project: 'Marketing', projectId: 1, column: 'in_progress', due: '2026-11-18', assignees: ['Jan Kowalski', 'Katarzyna Wiśniewska'] },
  { id: 11, title: 'Przegląd pił formatowych', project: 'Produkcja', projectId: 2, column: 'draft', due: '2026-11-19', assignees: ['Piotr Zieliński'] },
];

/** Moje niezakończone zadania ze wszystkich moich projektów: po terminie, potem według terminu, bez terminu na końcu. */
export const MY_TASKS: Record<'admin' | 'employee', DashboardTask[]> = {
  employee: [
    { id: 3, title: 'Przygotować ofertę dla hurtowni Lewiatan', project: 'Marketing', projectId: 1, column: 'in_progress', due: '2026-11-18', assignees: ['Jan Kowalski', 'Katarzyna Wiśniewska'] },
    { id: 5, title: 'Zdjęcia produktów do katalogu zimowego', project: 'Marketing', projectId: 1, column: 'in_progress', due: '2026-11-20', assignees: ['Jan Kowalski'] },
    { id: 9, title: 'Sprawdzić partię blatów dębowych', project: 'Produkcja', projectId: 2, column: 'draft', due: '2026-11-21', assignees: ['Jan Kowalski', 'Piotr Zieliński'] },
    { id: 12, title: 'Inwentaryzacja magazynu', project: 'Produkcja', projectId: 2, column: 'draft', due: '2026-11-30', assignees: ['Jan Kowalski'] },
    { id: 14, title: 'Zamówić tonery do drukarek', project: 'Produkcja', projectId: 2, column: 'draft', due: null, assignees: ['Jan Kowalski'] },
  ],
  admin: [
    { id: 16, title: 'Podpisać umowę z firmą transportową', project: 'Produkcja', projectId: 2, column: 'in_progress', due: '2026-11-24', assignees: ['Anna Nowak'] },
    { id: 17, title: 'Zatwierdzić projekt ulotki świątecznej', project: 'Marketing', projectId: 1, column: 'draft', due: '2026-12-02', assignees: ['Anna Nowak', 'Magdalena Lewandowska'] },
  ],
};

/** Pula Jana Kowalskiego w roku otwartym (te same pola co na ekranie Moje urlopy). */
export const MY_POOL: MyLeaveOverview['pool'] = {
  year: 2026, annualDays: 26, carriedDays: 4, usedCarried: 4, usedAnnual: 8, pendingDays: 2, pendingCarried: 0, leftDays: 16, leftCarriedDays: 0,
};

/** Wnioski Jana: czekające i najbliższy zatwierdzony urlop. */
export const MY_PENDING = [{ id: 21, type: 'Wypoczynkowy', from: '2026-11-26', to: '2026-11-27', days: 2 }];
export const MY_NEXT_LEAVE = { id: 19, type: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-23', days: 3 };
