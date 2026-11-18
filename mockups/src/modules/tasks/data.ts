/**
 * Zmyślone dane makiety modułu Zadania. „Dziś” = 18.11.2026. Urlopy zgadzają się z makietą Wniosków urlopowych
 * (Magdalena Lewandowska: zatwierdzony 23–27.11.2026 i 28–31.12.2026, Tomasz Wójcik: 21–22.12.2026), osoba
 * w archiwum z makietą Pracowników (Ewa Mazur). W makiecie pracownik to Jan Kowalski: należy do projektów
 * Marketing i Produkcja, więc „Montażu” nie widzi.
 */
export type Column = 'draft' | 'in_progress' | 'done';

export const COLUMNS: Column[] = ['draft', 'in_progress', 'done'];

export const TODAY = '2026-11-18';

/** Zrealizowane dawniej niż tyle dni temu chowają się same (przycisk pokazuje je ponownie). */
export const HIDE_DONE_AFTER_DAYS = 30;

/** Administratorzy widzą wszystkie projekty i można ich przypisać do każdego zadania. */
export const ADMINS = ['Anna Nowak'];

/** Aktywni pracownicy (do wyboru członków projektu). */
export const EMPLOYEES = ['Jan Kowalski', 'Katarzyna Wiśniewska', 'Piotr Zieliński', 'Magdalena Lewandowska', 'Tomasz Wójcik'];

/** Konta w archiwum: zostają przy starych zadaniach, nie da się ich przypisać do nowych. */
export const ARCHIVED_PEOPLE = ['Ewa Mazur'];

export interface MockProject {
  id: number;
  name: string;
  members: string[];
  createdAt: string;
}

/** Kolejność = kolejność w menu „Zadania”. */
export const PROJECTS: MockProject[] = [
  { id: 1, name: 'Marketing', members: ['Katarzyna Wiśniewska', 'Magdalena Lewandowska', 'Jan Kowalski'], createdAt: '2026-11-02' },
  { id: 2, name: 'Produkcja', members: ['Piotr Zieliński', 'Tomasz Wójcik', 'Jan Kowalski', 'Ewa Mazur'], createdAt: '2026-11-02' },
  { id: 3, name: 'Montaż', members: ['Tomasz Wójcik', 'Piotr Zieliński'], createdAt: '2026-11-04' },
];

export const projectById = (id: number) => PROJECTS.find((p) => p.id === id)!;

/** Kogo można przypisać do zadania w projekcie: członkowie spoza archiwum i administratorzy. */
export const assignable = (project: MockProject) => [...ADMINS, ...project.members.filter((m) => !ARCHIVED_PEOPLE.includes(m))];

/** Zatwierdzone urlopy (z modułu Wnioski urlopowe). Zadania widzą tylko daty, bez rodzaju urlopu. */
export const LEAVES: { person: string; from: string; to: string }[] = [
  { person: 'Magdalena Lewandowska', from: '2026-11-23', to: '2026-11-27' },
  { person: 'Magdalena Lewandowska', from: '2026-12-28', to: '2026-12-31' },
  { person: 'Tomasz Wójcik', from: '2026-12-21', to: '2026-12-22' },
];

export interface MockComment {
  id: number;
  author: string;
  createdAt: string;
  text: string;
  edited?: boolean;
}

export interface MockTask {
  id: number;
  projectId: number;
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
  comments?: MockComment[];
}

export const TASKS: MockTask[] = [
  // Marketing
  { id: 2, projectId: 1, column: 'draft', title: 'Kupić upominki świąteczne dla klientów', due: '2026-12-10', people: ['Magdalena Lewandowska'], createdBy: 'Anna Nowak', createdAt: '2026-11-12 09:05' },
  { id: 16, projectId: 1, column: 'draft', title: 'Post na Facebooku o promocji grudniowej', description: 'Zdjęcia nowych regałów, rabat 10% do 20.12.', people: ['Katarzyna Wiśniewska'], createdBy: 'Katarzyna Wiśniewska', createdAt: '2026-11-17 15:20' },
  { id: 6, projectId: 1, column: 'in_progress', title: 'Rozliczyć targi w Poznaniu', due: '2026-11-19', people: ['Katarzyna Wiśniewska'], createdBy: 'Anna Nowak', createdAt: '2026-11-03 08:15' },
  {
    id: 7, projectId: 1, column: 'in_progress', title: 'Przygotować ofertę dla hurtowni w Lesznie', description: 'Cennik na 2027, warunki dostaw i rabat przy zamówieniach powyżej 20 000 zł.', due: '2026-11-25', people: ['Magdalena Lewandowska', 'Jan Kowalski'], createdBy: 'Anna Nowak', createdAt: '2026-11-05 10:00',
    comments: [
      { id: 1, author: 'Magdalena Lewandowska', createdAt: '2026-11-12 09:40', text: 'Cennik gotowy, czeka na akceptację rabatu.' },
      { id: 2, author: 'Anna Nowak', createdAt: '2026-11-12 13:05', text: 'Rabat 7% przy 20 000 zł, 10% powyżej 50 000 zł. Bez darmowej dostawy.', edited: true },
      { id: 3, author: 'Jan Kowalski', createdAt: '2026-11-18 08:12', text: 'Magda od poniedziałku na urlopie, dokończę wysyłkę oferty.' },
    ],
  },
  { id: 11, projectId: 1, column: 'done', title: 'Zaktualizować cennik na stronie', people: ['Katarzyna Wiśniewska'], createdBy: 'Anna Nowak', createdAt: '2026-10-30 10:30', completedAt: '2026-11-06 12:00' },
  { id: 13, projectId: 1, column: 'done', title: 'Wybrać agencję do kampanii wiosennej', people: ['Anna Nowak'], createdBy: 'Anna Nowak', createdAt: '2026-09-25 08:00', completedAt: '2026-10-02 11:00' },
  // Produkcja
  { id: 1, projectId: 2, column: 'draft', title: 'Zamówić tonery do drukarek w hali', description: 'Brother przy wydawaniu i HP w biurze kierownika. Po dwa na zapas.', people: ['Jan Kowalski'], createdBy: 'Piotr Zieliński', createdAt: '2026-11-15 11:20', comments: [{ id: 4, author: 'Piotr Zieliński', createdAt: '2026-11-15 11:22', text: 'Numery tonerów są na naklejkach z boku drukarek.' }] },
  { id: 3, projectId: 2, column: 'draft', title: 'Odnowić umowę z firmą sprzątającą', description: 'Obecna kończy się 31.12. Poprosić o dwie oferty dla porównania.', due: '2026-12-15', people: ['Anna Nowak'], createdBy: 'Anna Nowak', createdAt: '2026-11-10 14:40' },
  { id: 4, projectId: 2, column: 'draft', title: 'Spisać plan dyżurów na okres świąteczny', people: [], createdBy: 'Piotr Zieliński', createdAt: '2026-11-17 16:02' },
  {
    id: 5, projectId: 2, column: 'in_progress', title: 'Inwentaryzacja magazynu w Poznaniu', description: 'Spis z natury, regały A–F. Arkusze są w folderze „Magazyn 2026”.', due: '2026-11-20', people: ['Jan Kowalski', 'Piotr Zieliński'], createdBy: 'Anna Nowak', createdAt: '2026-11-17 13:30',
    comments: [
      { id: 5, author: 'Piotr Zieliński', createdAt: '2026-11-17 15:10', text: 'Regały A–C policzone. Brakuje 4 palet płyt OSB, sprawdzam w dokumentach WZ.' },
      { id: 6, author: 'Jan Kowalski', createdAt: '2026-11-18 07:45', text: 'Dziś biorę D–F.' },
    ],
  },
  { id: 8, projectId: 2, column: 'in_progress', title: 'Szkolenie BHP dla nowych osób', due: '2026-11-10', people: ['Tomasz Wójcik', 'Piotr Zieliński'], createdBy: 'Anna Nowak', createdAt: '2026-10-20 12:00' },
  { id: 9, projectId: 2, column: 'in_progress', title: 'Uporządkować segregatory z dokumentami WZ za 2025', people: ['Ewa Mazur', 'Tomasz Wójcik'], createdBy: 'Ewa Mazur', createdAt: '2026-09-02 09:45' },
  { id: 14, projectId: 2, column: 'done', title: 'Inwentaryzacja kwartalna', people: ['Jan Kowalski', 'Ewa Mazur'], createdBy: 'Ewa Mazur', createdAt: '2026-09-15 08:00', completedAt: '2026-09-30 17:40' },
  // Montaż
  { id: 17, projectId: 3, column: 'draft', title: 'Zamówić śruby i kotwy do regałów', people: ['Piotr Zieliński'], createdBy: 'Tomasz Wójcik', createdAt: '2026-11-16 10:00' },
  { id: 18, projectId: 3, column: 'in_progress', title: 'Montaż regałów w hali B', description: 'Osiem rzędów po 12 m. Wózek widłowy zarezerwowany na 23–24.11.', due: '2026-11-24', people: ['Tomasz Wójcik', 'Piotr Zieliński'], createdBy: 'Anna Nowak', createdAt: '2026-11-09 08:30' },
  { id: 10, projectId: 3, column: 'done', title: 'Wymienić opony w samochodach służbowych', people: ['Tomasz Wójcik'], createdBy: 'Tomasz Wójcik', createdAt: '2026-10-28 07:50', completedAt: '2026-11-14 15:10' },
  { id: 12, projectId: 3, column: 'done', title: 'Przegląd gaśnic w hali', due: '2026-10-31', people: ['Piotr Zieliński'], createdBy: 'Piotr Zieliński', createdAt: '2026-10-12 09:00', completedAt: '2026-10-30 14:25' },
  { id: 15, projectId: 3, column: 'done', title: 'Kupić krzesła do sali spotkań', people: ['Tomasz Wójcik'], createdBy: 'Tomasz Wójcik', createdAt: '2026-07-20 13:00', completedAt: '2026-08-12 10:15' },
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
export const leaveBeforeDue = (task: { column: Column; due?: string | null }, person: string) => {
  if (task.column === 'done') return null;
  const until = task.due ?? addDays(TODAY, 14);
  if (until < TODAY) return null;
  return LEAVES.find((l) => l.person === person && l.from <= until && l.to >= TODAY) ?? null;
};

/** Otwarte zadania osoby w projekcie (ostrzeżenie przy usuwaniu jej z projektu). */
export const openTasksOf = (projectId: number, person: string) =>
  TASKS.filter((t) => t.projectId === projectId && t.column !== 'done' && t.people.includes(person));
