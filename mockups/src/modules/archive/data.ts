export interface ArchivedEmployee {
  id: number;
  name: string;
  login: string;
  role: 'admin' | 'employee';
  archivedAt: string;
  archivedBy: string;
  /** Ile wniosków urlopowych ma osoba (każdy status). */
  leaveRequests: number;
  /** Ile zadań, do których jest przypisana (otwartych i zrealizowanych). */
  tasks: number;
}

export interface ArchivedTask {
  id: number;
  title: string;
  description: string;
  project: string;
  column: 'draft' | 'in_progress' | 'done';
  dueOn: string | null;
  assignees: string[];
  comments: { author: string; at: string; text: string }[];
  archivedAt: string;
  archivedBy: string;
}

export const ARCHIVED_EMPLOYEES: ArchivedEmployee[] = [
  {
    id: 21,
    name: 'Robert Kamiński',
    login: 'robert.kaminski@firma.pl',
    role: 'employee',
    archivedAt: '2026-09-30 15:12',
    archivedBy: 'Anna Nowak',
    leaveRequests: 7,
    tasks: 4,
  },
  {
    id: 27,
    name: 'Karolina Zając',
    login: 'karolina.zajac@firma.pl',
    role: 'employee',
    archivedAt: '2026-11-03 09:40',
    archivedBy: 'Anna Nowak',
    leaveRequests: 0,
    tasks: 0,
  },
  {
    id: 14,
    name: 'Marek Lis',
    login: 'marek.lis@firma.pl',
    role: 'admin',
    archivedAt: '2026-06-12 11:05',
    archivedBy: 'Anna Nowak',
    leaveRequests: 3,
    tasks: 9,
  },
];

export const PROJECTS = ['Biuro', 'Strona internetowa', 'Targi Poznań 2027'];

export const ARCHIVED_TASKS: ArchivedTask[] = [
  {
    id: 31,
    title: 'Spotkanie z dostawcą papieru',
    description: 'Ustalić ceny na 2027 r. i termin dostaw. Przygotować porównanie z ofertą z Kielc.',
    project: 'Biuro',
    column: 'draft',
    dueOn: '2026-11-28',
    assignees: ['Tomasz Wójcik', 'Robert Kamiński'],
    comments: [
      { author: 'Tomasz Wójcik', at: '2026-11-08 10:14', text: 'Dostawca przesunął spotkanie na grudzień, przenoszę to do archiwum.' },
      { author: 'Anna Nowak', at: '2026-11-08 12:30', text: 'Ok, wrócimy do tego po Nowym Roku.' },
    ],
    archivedAt: '2026-11-10 08:47',
    archivedBy: 'Tomasz Wójcik',
  },
  {
    id: 32,
    title: 'Przegląd gaśnic',
    description: 'Coroczny przegląd w biurze i magazynie.',
    project: 'Biuro',
    column: 'done',
    dueOn: '2026-10-15',
    assignees: ['Anna Nowak'],
    comments: [],
    archivedAt: '2026-10-22 14:02',
    archivedBy: 'Anna Nowak',
  },
  {
    id: 33,
    title: 'Zdjęcia zespołu na stronę „O nas”',
    description: 'Fotograf z Gdańska, sesja w biurze, 12 osób.',
    project: 'Strona internetowa',
    column: 'in_progress',
    dueOn: null,
    assignees: ['Ewa Mazurek', 'Paweł Zieliński'],
    comments: [{ author: 'Ewa Mazurek', at: '2026-09-02 09:05', text: 'Wybieramy jednak zdjęcia z targów, ta sesja nie będzie potrzebna.' }],
    archivedAt: '2026-09-03 16:20',
    archivedBy: 'Ewa Mazurek',
  },
  {
    id: 34,
    title: 'Rezerwacja stoiska',
    description: 'Hala 5, stoisko narożne, min. 24 m².',
    project: 'Targi Poznań 2027',
    column: 'draft',
    dueOn: '2027-01-15',
    assignees: [],
    comments: [],
    archivedAt: '2026-11-18 13:55',
    archivedBy: 'Anna Nowak',
  },
];
