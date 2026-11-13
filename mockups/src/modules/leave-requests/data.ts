export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';

export const REQUESTS: {
  id: number;
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  left: number;
  status: LeaveStatus;
  comment?: string;
  submitted: string;
}[] = [
  { id: 14, employee: 'Jan Kowalski', type: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-31', days: 7, left: 21, status: 'pending', comment: 'Święta u rodziny w Gdańsku.', submitted: '2026-11-12' },
  { id: 15, employee: 'Katarzyna Wiśniewska', type: 'Na żądanie', from: '2026-11-17', to: '2026-11-17', days: 1, left: 12, status: 'pending', submitted: '2026-11-13' },
  { id: 16, employee: 'Piotr Zieliński', type: 'Okolicznościowy', from: '2026-11-27', to: '2026-11-28', days: 2, left: 18, status: 'pending', comment: 'Ślub brata.', submitted: '2026-11-13' },
  { id: 12, employee: 'Magdalena Lewandowska', type: 'Wypoczynkowy', from: '2026-11-02', to: '2026-11-06', days: 5, left: 9, status: 'approved', submitted: '2026-10-20' },
  { id: 10, employee: 'Tomasz Wójcik', type: 'Bezpłatny', from: '2026-10-19', to: '2026-10-23', days: 5, left: 14, status: 'rejected', submitted: '2026-10-01' },
  { id: 7, employee: 'Jan Kowalski', type: 'Wypoczynkowy', from: '2026-07-06', to: '2026-07-13', days: 6, left: 21, status: 'approved', submitted: '2026-06-15' },
];
