/**
 * Zmyślone dane makiety modułu Moje urlopy. Ogląda je Jan Kowalski (pracownik), „dziś” = 17.11.2026.
 * Liczby zgadzają się z makietą Pracowników (Jan: pula 26, zaległe 4, wykorzystane 9, czeka 2).
 */
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export const TODAY = '2026-11-17';

/** Pula na rok otwarty (jeszcze niezamknięty przez administratora). */
export const POOL = { year: 2026, annual: 26, carried: 4, usedCarried: 4, usedAnnual: 5, pending: 2 };

export interface MockLeaveType {
  id: number;
  name: string;
  deducts: boolean;
  /** Roczny limit dni na osobę (null = bez limitu) i ile z niego już zajęte (czekające + zatwierdzone). */
  limit: number | null;
  usedOfLimit: number;
}

/** Widoczne typy w kolejności z ekranu Typy urlopów. */
export const LEAVE_TYPES: MockLeaveType[] = [
  { id: 1, name: 'Wypoczynkowy', deducts: true, limit: null, usedOfLimit: 0 },
  { id: 2, name: 'Na żądanie', deducts: true, limit: 4, usedOfLimit: 1 },
  { id: 3, name: 'Okolicznościowy', deducts: false, limit: null, usedOfLimit: 0 },
  { id: 4, name: 'Bezpłatny', deducts: false, limit: null, usedOfLimit: 0 },
  { id: 5, name: 'Opieka nad dzieckiem', deducts: false, limit: 2, usedOfLimit: 0 },
];

export interface MockRequest {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  /** Podział dni (liczy serwer przy złożeniu); 0 i 0 = typ nie odejmuje dni z puli. */
  fromCarried: number;
  fromAnnual: number;
  status: LeaveStatus;
  createdAt: string;
  comment?: string;
  /** Kto i kiedy zdecydował (zatwierdził, odrzucił, anulował) oraz powód odrzucenia / anulowania. */
  decidedBy?: string;
  decidedAt?: string;
  reason?: string;
}

export const MY_REQUESTS: MockRequest[] = [
  { id: 21, type: 'Wypoczynkowy', from: '2026-11-26', to: '2026-11-27', days: 2, fromCarried: 0, fromAnnual: 2, status: 'pending', createdAt: '2026-11-16 09:12', comment: 'Wyjazd rodzinny, wracam w poniedziałek.' },
  { id: 18, type: 'Na żądanie', from: '2026-10-09', to: '2026-10-09', days: 1, fromCarried: 0, fromAnnual: 1, status: 'approved', createdAt: '2026-10-09 07:40', decidedBy: 'Anna Nowak', decidedAt: '2026-10-09 08:05' },
  { id: 15, type: 'Wypoczynkowy', from: '2026-08-03', to: '2026-08-14', days: 10, fromCarried: 0, fromAnnual: 10, status: 'rejected', createdAt: '2026-06-22 14:30', decidedBy: 'Anna Nowak', decidedAt: '2026-06-23 10:15', reason: 'W tym terminie inwentaryzacja, proszę o inny termin.' },
  { id: 12, type: 'Wypoczynkowy', from: '2026-07-06', to: '2026-07-13', days: 6, fromCarried: 4, fromAnnual: 2, status: 'approved', createdAt: '2026-06-01 11:02', decidedBy: 'Anna Nowak', decidedAt: '2026-06-02 09:30' },
  { id: 10, type: 'Okolicznościowy', from: '2026-05-14', to: '2026-05-15', days: 2, fromCarried: 0, fromAnnual: 0, status: 'approved', createdAt: '2026-05-06 16:20', comment: 'Ślub siostry.', decidedBy: 'Anna Nowak', decidedAt: '2026-05-07 08:10' },
  { id: 8, type: 'Wypoczynkowy', from: '2026-05-04', to: '2026-05-05', days: 2, fromCarried: 0, fromAnnual: 2, status: 'approved', createdAt: '2026-04-20 10:00', decidedBy: 'Anna Nowak', decidedAt: '2026-04-20 12:45' },
  { id: 6, type: 'Na żądanie', from: '2026-03-16', to: '2026-03-16', days: 1, fromCarried: 0, fromAnnual: 0, status: 'withdrawn', createdAt: '2026-03-16 06:55' },
  { id: 4, type: 'Wypoczynkowy', from: '2026-02-16', to: '2026-02-20', days: 5, fromCarried: 0, fromAnnual: 0, status: 'cancelled', createdAt: '2026-01-12 13:00', decidedBy: 'Anna Nowak', decidedAt: '2026-02-10 15:20', reason: 'Zmiana planów po rozmowie, dni wróciły do puli.' },
];

/** Lata, w których są wnioski (wybór roku nad listą). */
export const REQUEST_YEARS = ['2026', '2025'];

/** Przykładowe wypełnienia okna wniosku dla stanów makiety. */
export const FORM_EXAMPLES = {
  ok: { typeId: '1', from: '2026-12-21', to: '2026-12-31', comment: 'Święta u rodziców.' },
  not_enough: { typeId: '1', from: '2026-11-30', to: '2026-12-31', comment: '' },
  limit: { typeId: '2', from: '2026-11-18', to: '2026-11-23', comment: '' },
  overlap: { typeId: '1', from: '2026-11-27', to: '2026-11-27', comment: '' },
  next_year: { typeId: '1', from: '2027-01-11', to: '2027-01-15', comment: '' },
} as const;
