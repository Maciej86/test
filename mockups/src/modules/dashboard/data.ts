export const PENDING_REQUESTS = [
  { id: 1, employee: 'Jan Kowalski', type: 'Wypoczynkowy', from: '2026-12-21', to: '2026-12-31', days: 7 },
  { id: 2, employee: 'Katarzyna Wiśniewska', type: 'Na żądanie', from: '2026-11-17', to: '2026-11-17', days: 1 },
  { id: 3, employee: 'Piotr Zieliński', type: 'Okolicznościowy', from: '2026-11-27', to: '2026-11-28', days: 2 },
];

export const TASK_COUNTS = { draft: 6, inProgress: 4, done: 12, overdue: 2 };

export const MY_POOL = { year: 2026, annual: 26, carriedOver: 4, used: 9 };

export const MY_TASKS = [
  { id: 1, title: 'Przygotować ofertę dla hurtowni Lewiatan', due: '2026-11-18', column: 'W toku' },
  { id: 2, title: 'Zamówić tonery do drukarek', due: null, column: 'W opracowaniu' },
  { id: 3, title: 'Inwentaryzacja magazynu', due: '2026-11-30', column: 'W opracowaniu' },
];
