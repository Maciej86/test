import type { LeaveDayCount } from '@app/shared';
/**
 * Zmyślone dane makiety modułu Wnioski urlopowe. Ogląda je Anna Nowak (administrator), „dziś” = 17.11.2026.
 * Liczby zgadzają się z makietami Pracowników i Moich urlopów (Jan Kowalski: pula 26, zaległe 4, wykorzystane 9,
 * czeka 2; wniosek nr 21 na 26–27.11.2026).
 */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export const TODAY = '2026-11-17';
export const OPEN_YEAR = 2026;
export const ME = 'Anna Nowak';

export interface MockPool {
  annual: number;
  carried: number;
  /** Dni zatwierdzone (wykorzystane albo zaplanowane) i dni z wniosków czekających. */
  used: number;
  pending: number;
}

/** Pula otwartego roku każdej osoby (jak w makiecie Pracowników). */
export const POOLS: Record<string, MockPool> = {
  'Jan Kowalski': { annual: 26, carried: 4, used: 9, pending: 2 },
  'Katarzyna Wiśniewska': { annual: 20, carried: 2, used: 10, pending: 1 },
  'Piotr Zieliński': { annual: 26, carried: 0, used: 8, pending: 3 },
  'Magdalena Lewandowska': { annual: 26, carried: 6, used: 23, pending: 0 },
  'Tomasz Wójcik': { annual: 20, carried: 5, used: 4, pending: 0 },
};

export const poolLeft = (p: MockPool) => p.annual + p.carried - p.used - p.pending;

export interface MockRequest {
  id: number;
  employee: string;
  type: string;
  /** Czy typ odejmuje dni z puli (Okolicznościowy i Bezpłatny nie odejmują). */
  deducts: boolean;
  from: string;
  to: string;
  days: number;
  fromCarried: number;
  fromAnnual: number;
  status: LeaveStatus;
  createdAt: string;
  comment?: string;
  decidedBy?: string;
  decidedAt?: string;
  /** Powód odrzucenia albo anulowania. */
  reason?: string;
  /** Sposób liczenia dni wniosku (brak = robocze) i zatwierdzenie bez decyzji (typ bez zatwierdzania). */
  dayCount?: LeaveDayCount;
  auto?: boolean;
}

export const REQUESTS: MockRequest[] = [
  // Czekają na decyzję
  { id: 24, employee: 'Piotr Zieliński', type: 'Wypoczynkowy', deducts: true, from: '2026-12-21', to: '2026-12-24', days: 3, fromCarried: 0, fromAnnual: 3, status: 'pending', createdAt: '2026-11-17 08:05', comment: 'Wyjazd do rodziców w Rzeszowie. W razie pilnej sprawy jestem pod telefonem.' },
  { id: 21, employee: 'Jan Kowalski', type: 'Wypoczynkowy', deducts: true, from: '2026-11-26', to: '2026-11-27', days: 2, fromCarried: 0, fromAnnual: 2, status: 'pending', createdAt: '2026-11-16 09:12', comment: 'Wyjazd rodzinny, wracam w poniedziałek.' },
  { id: 19, employee: 'Katarzyna Wiśniewska', type: 'Na żądanie', deducts: true, from: '2026-11-13', to: '2026-11-13', days: 1, fromCarried: 0, fromAnnual: 1, status: 'pending', createdAt: '2026-11-13 06:48' },
  // Rozpatrzone
  { id: 25, employee: 'Tomasz Wójcik', type: 'Chorobowe', deducts: false, from: '2026-11-16', to: '2026-11-22', days: 7, fromCarried: 0, fromAnnual: 0, status: 'approved', createdAt: '2026-11-16 07:20', dayCount: 'calendar', auto: true },
  { id: 23, employee: 'Tomasz Wójcik', type: 'Wypoczynkowy', deducts: true, from: '2026-12-21', to: '2026-12-22', days: 2, fromCarried: 2, fromAnnual: 0, status: 'approved', createdAt: '2026-11-04 12:30', decidedBy: 'Anna Nowak', decidedAt: '2026-11-04 15:10' },
  { id: 22, employee: 'Magdalena Lewandowska', type: 'Wypoczynkowy', deducts: true, from: '2026-11-23', to: '2026-11-27', days: 5, fromCarried: 0, fromAnnual: 5, status: 'approved', createdAt: '2026-11-02 10:15', decidedBy: 'Anna Nowak', decidedAt: '2026-11-03 08:40' },
  { id: 20, employee: 'Magdalena Lewandowska', type: 'Wypoczynkowy', deducts: true, from: '2026-12-28', to: '2026-12-31', days: 4, fromCarried: 0, fromAnnual: 4, status: 'approved', createdAt: '2026-10-28 09:00', decidedBy: 'Anna Nowak', decidedAt: '2026-10-28 11:20' },
  { id: 18, employee: 'Jan Kowalski', type: 'Na żądanie', deducts: true, from: '2026-10-09', to: '2026-10-09', days: 1, fromCarried: 0, fromAnnual: 1, status: 'approved', createdAt: '2026-10-09 07:40', decidedBy: 'Anna Nowak', decidedAt: '2026-10-09 08:05' },
  { id: 17, employee: 'Tomasz Wójcik', type: 'Bezpłatny', deducts: false, from: '2026-10-19', to: '2026-10-23', days: 5, fromCarried: 0, fromAnnual: 0, status: 'rejected', createdAt: '2026-10-01 14:02', decidedBy: 'Anna Nowak', decidedAt: '2026-10-02 09:30', reason: 'W tym tygodniu jest audyt, potrzebuję całego zespołu. Proszę o termin w listopadzie.' },
  { id: 15, employee: 'Jan Kowalski', type: 'Wypoczynkowy', deducts: true, from: '2026-08-03', to: '2026-08-14', days: 10, fromCarried: 0, fromAnnual: 0, status: 'rejected', createdAt: '2026-06-22 14:30', decidedBy: 'Anna Nowak', decidedAt: '2026-06-23 10:15', reason: 'W tym terminie inwentaryzacja, proszę o inny termin.' },
  { id: 12, employee: 'Jan Kowalski', type: 'Wypoczynkowy', deducts: true, from: '2026-07-06', to: '2026-07-13', days: 6, fromCarried: 4, fromAnnual: 2, status: 'approved', createdAt: '2026-06-01 11:02', decidedBy: 'Anna Nowak', decidedAt: '2026-06-02 09:30' },
  { id: 11, employee: 'Katarzyna Wiśniewska', type: 'Okolicznościowy', deducts: false, from: '2026-06-18', to: '2026-06-19', days: 2, fromCarried: 0, fromAnnual: 0, status: 'approved', createdAt: '2026-06-10 13:25', comment: 'Ślub brata.', decidedBy: 'Anna Nowak', decidedAt: '2026-06-10 16:00' },
  { id: 6, employee: 'Jan Kowalski', type: 'Na żądanie', deducts: true, from: '2026-03-16', to: '2026-03-16', days: 1, fromCarried: 0, fromAnnual: 0, status: 'withdrawn', createdAt: '2026-03-16 06:55' },
  { id: 4, employee: 'Jan Kowalski', type: 'Wypoczynkowy', deducts: true, from: '2026-02-16', to: '2026-02-20', days: 5, fromCarried: 0, fromAnnual: 0, status: 'cancelled', createdAt: '2026-01-12 13:00', decidedBy: 'Anna Nowak', decidedAt: '2026-02-10 15:20', reason: 'Zmiana planów po rozmowie, dni wróciły do puli.' },
  { id: 2, employee: 'Katarzyna Wiśniewska', type: 'Wypoczynkowy', deducts: true, from: '2025-12-22', to: '2025-12-31', days: 6, fromCarried: 0, fromAnnual: 6, status: 'approved', createdAt: '2025-11-20 10:10', decidedBy: 'Anna Nowak', decidedAt: '2025-11-21 08:30' },
];

export const YEARS = ['2026', '2025'];
export const LEAVE_TYPES = ['Wypoczynkowy', 'Na żądanie', 'Okolicznościowy', 'Bezpłatny', 'Opieka nad dzieckiem'];

/** Zatwierdzone i czekające wnioski innych osób, które mają choć jeden wspólny dzień z wnioskiem `r`. */
export const overlapping = (r: MockRequest) =>
  REQUESTS.filter(
    (o) => o.id !== r.id && o.employee !== r.employee && (o.status === 'approved' || o.status === 'pending') && o.from <= r.to && o.to >= r.from,
  );
