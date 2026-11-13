export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export const POOL = { year: 2026, annual: 26, carriedOver: 4, usedCarried: 4, usedAnnual: 5 };

export const LEAVE_TYPES = ['Wypoczynkowy', 'Na żądanie', 'Okolicznościowy', 'Bezpłatny', 'Opieka nad dzieckiem'];

export const MY_REQUESTS: {
  id: number;
  type: string;
  from: string;
  to: string;
  days: number;
  status: LeaveStatus;
  note?: string;
}[] = [
  { id: 14, type: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-31', days: 7, status: 'pending' },
  { id: 11, type: 'Na żądanie', from: '2026-10-09', to: '2026-10-09', days: 1, status: 'approved' },
  { id: 9, type: 'Wypoczynkowy', from: '2026-08-03', to: '2026-08-14', days: 10, status: 'rejected', note: 'W tym terminie inwentaryzacja, proszę o inny termin.' },
  { id: 8, type: 'Wypoczynkowy', from: '2026-07-06', to: '2026-07-13', days: 6, status: 'approved' },
  { id: 5, type: 'Okolicznościowy', from: '2026-05-14', to: '2026-05-15', days: 2, status: 'withdrawn' },
];
