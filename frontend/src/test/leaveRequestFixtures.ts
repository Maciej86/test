import type { LeaveRequestDetails, LeaveRequestListItem, LeaveRequestsListResponse } from '@app/shared';

/** Dane do testów ekranów modułu (jak w makiecie: Jan Kowalski, 26–27.11.2026). */
export const requestItem = (o: Partial<LeaveRequestListItem> = {}): LeaveRequestListItem => ({
  id: 21, employeeName: 'Jan Kowalski', employeeArchived: false, leaveTypeName: 'Wypoczynkowy', deductsPool: true,
  dateFrom: '2026-11-26', dateTo: '2026-11-27', workingDays: 2, daysFromCarried: 0, daysFromAnnual: 2, poolYear: 2026,
  comment: 'Wyjazd rodzinny, wracam w poniedziałek.', status: 'pending', decisionReason: null, decidedByName: null, decidedAt: null,
  createdAt: '2026-11-16T08:12:00.000Z', poolLeft: { left: 19, total: 30 }, canCancel: false, ...o,
});

export const list = (items: LeaveRequestListItem[], o: Partial<LeaveRequestsListResponse> = {}): LeaveRequestsListResponse => ({
  items, total: items.length, page: 1, pageSize: 25, pendingCount: 3, oldestPendingAt: '2026-11-13T05:48:00.000Z',
  years: [2026, 2025], leaveTypes: [{ id: 1, name: 'Wypoczynkowy' }, { id: 2, name: 'Na żądanie' }], ...o,
});


export const details = (o: Partial<LeaveRequestDetails> = {}): LeaveRequestDetails => ({
  ...requestItem(),
  pool: { year: 2026, annualDays: 26, carriedDays: 4, used: 9, pending: 2, left: 19 },
  others: [],
  ...o,
});
