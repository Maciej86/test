/**
 * Zmyślone dane makiety modułu Kalendarz. Ogląda je Anna Nowak (administrator), „dziś” = 17.11.2026.
 * Wnioski zgadzają się z makietą Wniosków urlopowych (np. nr 21 Jana Kowalskiego na 26–27.11.2026 czeka,
 * nr 22 Magdaleny Lewandowskiej na 23–27.11.2026 zatwierdzony).
 */
export const TODAY = '2026-11-17';

/** Rodzaj nieobecności: urlop (każdy typ poza chorobowym) albo chorobowe. */
export type AbsenceKind = 'leave' | 'sick';
export type AbsenceStatus = 'approved' | 'pending';

export interface MockEmployee {
  id: number;
  name: string;
  position: string;
}

export interface MockAbsence {
  id: number;
  employeeId: number;
  type: string;
  kind: AbsenceKind;
  status: AbsenceStatus;
  from: string;
  to: string;
  /** Dni robocze. */
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
  // Listopad
  { id: 15, employeeId: 7, type: 'Wypoczynkowy', kind: 'leave', status: 'approved', from: '2026-11-02', to: '2026-11-06', days: 5, createdAt: '2026-10-12 08:30', decidedAt: '2026-10-12 10:00' },
  { id: 19, employeeId: 3, type: 'Na żądanie', kind: 'leave', status: 'pending', from: '2026-11-13', to: '2026-11-13', days: 1, createdAt: '2026-11-13 06:48' },
  { id: 25, employeeId: 6, type: 'Chorobowe', kind: 'sick', status: 'approved', from: '2026-11-16', to: '2026-11-20', days: 5, createdAt: '2026-11-16 07:15', comment: 'Zwolnienie lekarskie, e-ZLA wysłane przez lekarza.', decidedAt: '2026-11-16 08:02' },
  { id: 26, employeeId: 10, type: 'Chorobowe', kind: 'sick', status: 'pending', from: '2026-11-17', to: '2026-11-18', days: 2, createdAt: '2026-11-17 07:40', comment: 'Gorączka, byłam u lekarza rano.' },
  { id: 17, employeeId: 9, type: 'Okolicznościowy', kind: 'leave', status: 'approved', from: '2026-11-09', to: '2026-11-10', days: 2, createdAt: '2026-10-30 12:00', comment: 'Ślub siostry.', decidedAt: '2026-10-30 14:20' },
  { id: 22, employeeId: 5, type: 'Wypoczynkowy', kind: 'leave', status: 'approved', from: '2026-11-23', to: '2026-11-27', days: 5, createdAt: '2026-11-02 10:15', decidedAt: '2026-11-03 08:40' },
  { id: 21, employeeId: 2, type: 'Wypoczynkowy', kind: 'leave', status: 'pending', from: '2026-11-26', to: '2026-11-27', days: 2, createdAt: '2026-11-16 09:12', comment: 'Wyjazd rodzinny, wracam w poniedziałek.' },
  { id: 27, employeeId: 8, type: 'Opieka nad dzieckiem', kind: 'leave', status: 'approved', from: '2026-11-19', to: '2026-11-20', days: 2, createdAt: '2026-11-10 15:30', decidedAt: '2026-11-11 09:00' },
  // Grudzień
  { id: 24, employeeId: 4, type: 'Wypoczynkowy', kind: 'leave', status: 'pending', from: '2026-12-21', to: '2026-12-24', days: 3, createdAt: '2026-11-17 08:05', comment: 'Wyjazd do rodziców w Rzeszowie. W razie pilnej sprawy jestem pod telefonem.' },
  { id: 23, employeeId: 6, type: 'Wypoczynkowy', kind: 'leave', status: 'approved', from: '2026-12-21', to: '2026-12-22', days: 2, createdAt: '2026-11-04 12:30', decidedAt: '2026-11-04 15:10' },
  { id: 20, employeeId: 5, type: 'Wypoczynkowy', kind: 'leave', status: 'approved', from: '2026-12-28', to: '2026-12-31', days: 4, createdAt: '2026-10-28 09:00', decidedAt: '2026-10-28 11:20' },
  { id: 28, employeeId: 9, type: 'Wypoczynkowy', kind: 'leave', status: 'approved', from: '2026-12-07', to: '2026-12-11', days: 5, createdAt: '2026-11-05 11:00', decidedAt: '2026-11-05 13:45' },
];

export const employeeName = (id: number) => EMPLOYEES.find((e) => e.id === id)?.name ?? '';
