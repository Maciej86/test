/**
 * Zmyślone dane makiety modułu Kalendarz. Ogląda je Anna Nowak (administrator), „dziś” = 17.11.2026.
 * Wnioski zgadzają się z makietą Wniosków urlopowych (np. nr 21 Jana Kowalskiego na 26–27.11.2026 czeka,
 * nr 22 Magdaleny Lewandowskiej na 23–27.11.2026 zatwierdzony). Typy jak w makiecie Typów urlopów.
 */
export const TODAY = '2026-11-17';
/** Kalendarz pokazuje dziś i 60 kolejnych dni. */
export const RANGE_DAYS = 61;
/** O ile dni przesuwają strzałki. */
export const RANGE_STEP = 30;

export type AbsenceStatus = 'approved' | 'pending';

export interface MockType {
  id: number;
  name: string;
  dayCount: 'working' | 'calendar';
  approval: boolean;
  color: string;
}

export const TYPES: MockType[] = [
  { id: 1, name: 'Wypoczynkowy', dayCount: 'working', approval: true, color: 'green' },
  { id: 2, name: 'Na żądanie', dayCount: 'working', approval: true, color: 'green' },
  { id: 7, name: 'Chorobowe', dayCount: 'calendar', approval: false, color: 'grape' },
  { id: 8, name: 'Ojcowski', dayCount: 'calendar', approval: true, color: 'cyan' },
  { id: 3, name: 'Okolicznościowy', dayCount: 'working', approval: true, color: 'teal' },
  { id: 4, name: 'Bezpłatny', dayCount: 'working', approval: true, color: 'orange' },
  { id: 5, name: 'Opieka nad dzieckiem', dayCount: 'working', approval: true, color: 'navy' },
];

export interface MockEmployee {
  id: number;
  name: string;
  position: string;
}

export interface MockAbsence {
  id: number;
  employeeId: number;
  typeId: number;
  status: AbsenceStatus;
  from: string;
  to: string;
  /** Dni liczone jak w typie (robocze albo kalendarzowe). */
  days: number;
  createdAt: string;
  comment?: string;
  decidedAt?: string;
}

/** Aktywni pracownicy, alfabetycznie po nazwisku (osoby z archiwum nie mają wiersza). */
export const EMPLOYEES: MockEmployee[] = [
  { id: 8, name: 'Paweł Dąbrowski', position: 'Magazynier' },
  { id: 9, name: 'Agnieszka Kamińska', position: 'Księgowa' },
  { id: 2, name: 'Jan Kowalski', position: 'Specjalista ds. sprzedaży' },
  { id: 5, name: 'Magdalena Lewandowska', position: 'Kierownik biura' },
  { id: 7, name: 'Marek Nowicki', position: 'Kierowca' },
  { id: 10, name: 'Joanna Szymańska', position: 'Asystentka zarządu' },
  { id: 3, name: 'Katarzyna Wiśniewska', position: 'Księgowa' },
  { id: 6, name: 'Tomasz Wójcik', position: 'Informatyk' },
  { id: 4, name: 'Piotr Zieliński', position: 'Handlowiec' },
];

export const ABSENCES: MockAbsence[] = [
  { id: 15, employeeId: 7, typeId: 1, status: 'approved', from: '2026-11-02', to: '2026-11-06', days: 5, createdAt: '2026-10-12 08:30', decidedAt: '2026-10-12 10:00' },
  { id: 25, employeeId: 6, typeId: 7, status: 'approved', from: '2026-11-16', to: '2026-11-22', days: 7, createdAt: '2026-11-16 07:15', comment: 'Zwolnienie lekarskie, e-ZLA wysłane przez lekarza.' },
  { id: 26, employeeId: 10, typeId: 7, status: 'approved', from: '2026-11-17', to: '2026-11-19', days: 3, createdAt: '2026-11-17 07:40', comment: 'Gorączka, byłam u lekarza rano.' },
  { id: 27, employeeId: 8, typeId: 5, status: 'approved', from: '2026-11-19', to: '2026-11-20', days: 2, createdAt: '2026-11-10 15:30', decidedAt: '2026-11-11 09:00' },
  { id: 22, employeeId: 5, typeId: 1, status: 'approved', from: '2026-11-23', to: '2026-11-27', days: 5, createdAt: '2026-11-02 10:15', decidedAt: '2026-11-03 08:40' },
  { id: 21, employeeId: 2, typeId: 1, status: 'pending', from: '2026-11-26', to: '2026-11-27', days: 2, createdAt: '2026-11-16 09:12', comment: 'Wyjazd rodzinny, wracam w poniedziałek.' },
  { id: 29, employeeId: 8, typeId: 8, status: 'pending', from: '2026-12-03', to: '2026-12-16', days: 14, createdAt: '2026-11-15 18:20', comment: 'Urodził się syn, akt urodzenia doniosę.' },
  { id: 28, employeeId: 9, typeId: 1, status: 'approved', from: '2026-12-07', to: '2026-12-15', days: 7, createdAt: '2026-11-05 11:00', decidedAt: '2026-11-05 13:45' },
  { id: 30, employeeId: 3, typeId: 2, status: 'pending', from: '2026-12-04', to: '2026-12-04', days: 1, createdAt: '2026-11-17 06:55' },
  { id: 24, employeeId: 4, typeId: 1, status: 'pending', from: '2026-12-21', to: '2026-12-31', days: 7, createdAt: '2026-11-17 08:05', comment: 'Wyjazd do rodziców w Rzeszowie. W razie pilnej sprawy jestem pod telefonem.' },
  { id: 23, employeeId: 6, typeId: 1, status: 'approved', from: '2026-12-21', to: '2026-12-23', days: 3, createdAt: '2026-11-04 12:30', decidedAt: '2026-11-04 15:10' },
  { id: 20, employeeId: 5, typeId: 1, status: 'approved', from: '2026-12-28', to: '2027-01-08', days: 8, createdAt: '2026-10-28 09:00', decidedAt: '2026-10-28 11:20' },
  { id: 31, employeeId: 7, typeId: 4, status: 'approved', from: '2027-01-11', to: '2027-01-15', days: 5, createdAt: '2026-11-12 14:00', decidedAt: '2026-11-12 16:30' },
];

export const employeeOf = (id: number) => EMPLOYEES.find((e) => e.id === id)!;
export const typeOf = (id: number) => TYPES.find((tp) => tp.id === id)!;
