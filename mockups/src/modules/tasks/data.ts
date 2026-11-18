/**
 * Zmyślone dane makiety modułu Zadania. „Dziś” = 18.11.2026. Urlopy zgadzają się z makietą Wniosków urlopowych
 * (Magdalena Lewandowska: zatwierdzony 23–27.11.2026 i 28–31.12.2026, Tomasz Wójcik: 21–22.12.2026), osoba
 * w archiwum z makietą Pracowników (Ewa Mazur), przypisanie Jana Kowalskiego z makietą Powiadomień.
 */
export type Column = 'draft' | 'in_progress' | 'done';

export const COLUMNS: Column[] = ['draft', 'in_progress', 'done'];

export const TODAY = '2026-11-18';

/** Zrealizowane dawniej niż tyle dni temu chowają się same (przycisk pokazuje je ponownie). */
export const HIDE_DONE_AFTER_DAYS = 30;

export interface MockTask {
  id: number;
  column: Column;
  title: string;
  description?: string;
  /** Termin `RRRR-MM-DD`, nieobowiązkowy. */
  due?: string;
  people: string[];
  createdBy: string;
  createdAt: string;
  /** Kiedy trafiło do „Zrealizowane” (liczy serwer). */
  completedAt?: string;
}

/** Osoby, które można przypisać (aktywne konta, także administrator). */
export const PEOPLE = ['Anna Nowak', 'Jan Kowalski', 'Katarzyna Wiśniewska', 'Piotr Zieliński', 'Magdalena Lewandowska', 'Tomasz Wójcik'];

/** Konta w archiwum: zostają przy starych zadaniach, nie da się ich przypisać do nowych. */
export const ARCHIVED_PEOPLE = ['Ewa Mazur'];

/** Zatwierdzone urlopy (z modułu Wnioski urlopowe). Zadania widzą tylko daty, bez rodzaju urlopu. */
export const LEAVES: { person: string; from: string; to: string }[] = [
  { person: 'Magdalena Lewandowska', from: '2026-11-23', to: '2026-11-27' },
  { person: 'Magdalena Lewandowska', from: '2026-12-28', to: '2026-12-31' },
  { person: 'Tomasz Wójcik', from: '2026-12-21', to: '2026-12-22' },
];

export const TASKS: MockTask[] = [
  { id: 1, column: 'draft', title: 'Zamówić tonery do drukarek', description: 'Brother w księgowości i HP przy recepcji. Najlepiej po dwa na zapas.', people: ['Jan Kowalski', 'Katarzyna Wiśniewska'], createdBy: 'Katarzyna Wiśniewska', createdAt: '2026-11-15 11:20' },
  { id: 2, column: 'draft', title: 'Kupić upominki świąteczne dla klientów', due: '2026-12-10', people: ['Magdalena Lewandowska'], createdBy: 'Anna Nowak', createdAt: '2026-11-12 09:05' },
  { id: 3, column: 'draft', title: 'Odnowić umowę z firmą sprzątającą', description: 'Obecna kończy się 31.12. Poprosić o dwie oferty dla porównania.', due: '2026-12-15', people: ['Anna Nowak'], createdBy: 'Anna Nowak', createdAt: '2026-11-10 14:40' },
  { id: 4, column: 'draft', title: 'Spisać plan dyżurów na okres świąteczny', people: [], createdBy: 'Piotr Zieliński', createdAt: '2026-11-17 16:02' },
  { id: 5, column: 'in_progress', title: 'Inwentaryzacja magazynu w Poznaniu', description: 'Spis z natury, regały A–F. Arkusze są w folderze „Magazyn 2026”.', due: '2026-11-20', people: ['Jan Kowalski', 'Piotr Zieliński'], createdBy: 'Anna Nowak', createdAt: '2026-11-17 13:30' },
  { id: 6, column: 'in_progress', title: 'Rozliczyć delegacje za październik', due: '2026-11-19', people: ['Katarzyna Wiśniewska'], createdBy: 'Anna Nowak', createdAt: '2026-11-03 08:15' },
  { id: 7, column: 'in_progress', title: 'Przygotować ofertę dla hurtowni w Lesznie', description: 'Cennik na 2027, warunki dostaw i rabat przy zamówieniach powyżej 20 000 zł.', due: '2026-11-25', people: ['Magdalena Lewandowska', 'Jan Kowalski'], createdBy: 'Anna Nowak', createdAt: '2026-11-05 10:00' },
  { id: 8, column: 'in_progress', title: 'Szkolenie BHP dla nowych osób', due: '2026-11-10', people: ['Tomasz Wójcik', 'Magdalena Lewandowska'], createdBy: 'Anna Nowak', createdAt: '2026-10-20 12:00' },
  { id: 9, column: 'in_progress', title: 'Uporządkować segregatory z fakturami za 2025', people: ['Ewa Mazur', 'Tomasz Wójcik'], createdBy: 'Ewa Mazur', createdAt: '2026-09-02 09:45' },
  { id: 10, column: 'done', title: 'Wymienić opony w samochodach służbowych', people: ['Tomasz Wójcik'], createdBy: 'Tomasz Wójcik', createdAt: '2026-10-28 07:50', completedAt: '2026-11-14 15:10' },
  { id: 11, column: 'done', title: 'Zaktualizować cennik na stronie', people: ['Katarzyna Wiśniewska'], createdBy: 'Anna Nowak', createdAt: '2026-10-30 10:30', completedAt: '2026-11-06 12:00' },
  { id: 12, column: 'done', title: 'Przegląd gaśnic w biurze', due: '2026-10-31', people: ['Piotr Zieliński'], createdBy: 'Piotr Zieliński', createdAt: '2026-10-12 09:00', completedAt: '2026-10-30 14:25' },
  // Zrealizowane ponad 30 dni temu: schowane, dopóki ktoś nie kliknie „Pokaż starsze zrealizowane”.
  { id: 13, column: 'done', title: 'Spotkanie z księgową w sprawie JPK', people: ['Anna Nowak'], createdBy: 'Anna Nowak', createdAt: '2026-09-25 08:00', completedAt: '2026-10-02 11:00' },
  { id: 14, column: 'done', title: 'Inwentaryzacja kwartalna', people: ['Jan Kowalski', 'Ewa Mazur'], createdBy: 'Ewa Mazur', createdAt: '2026-09-15 08:00', completedAt: '2026-09-30 17:40' },
  { id: 15, column: 'done', title: 'Kupić krzesła do sali spotkań', people: ['Katarzyna Wiśniewska'], createdBy: 'Katarzyna Wiśniewska', createdAt: '2026-07-20 13:00', completedAt: '2026-08-12 10:15' },
];

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Czy zrealizowane zadanie jest już „stare” (schowane). */
export const isOldDone = (task: MockTask) =>
  task.column === 'done' && !!task.completedAt && task.completedAt.slice(0, 10) < addDays(TODAY, -HIDE_DONE_AFTER_DAYS);

/** Termin: `overdue` po czasie, `soon` dziś albo jutro; zrealizowane nie mają wyróżnienia. */
export const dueState = (task: MockTask): 'overdue' | 'soon' | 'normal' | null => {
  if (!task.due) return null;
  if (task.column === 'done') return 'normal';
  if (task.due < TODAY) return 'overdue';
  if (task.due <= addDays(TODAY, 1)) return 'soon';
  return 'normal';
};

/**
 * Urlop osoby, który wypada przed terminem zadania (od dziś do terminu; bez terminu: w najbliższych 14 dniach).
 * Dla zrealizowanych i po terminie nie pokazujemy.
 */
export const leaveBeforeDue = (task: MockTask, person: string) => {
  if (task.column === 'done') return null;
  const until = task.due ?? addDays(TODAY, 14);
  if (until < TODAY) return null;
  return LEAVES.find((l) => l.person === person && l.from <= until && l.to >= TODAY) ?? null;
};
