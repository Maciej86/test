/** Zmyślony wniosek do podglądu e-maila „Nowy wniosek urlopowy” (wysyła go pracownik, dostaje administrator). */
export const NEW_REQUEST_EMAIL = {
  fromName: 'Urlopy i zadania',
  fromAddress: 'no-reply@urlopy.firma.pl',
  toName: 'Anna Nowak',
  toAddress: 'anna.nowak@firma.pl',
  sentAt: '2026-11-16T09:42:00',
  employee: 'Jan Kowalski',
  leaveType: 'Wypoczynkowy',
  dateFrom: '2027-02-08',
  dateTo: '2027-02-12',
  workingDays: 5,
  fromCarried: 3,
  fromAnnual: 2,
  /** Ile dni zostanie w puli 2027 po zatwierdzeniu (26 − 2). */
  leftAfter: 24,
  comment: 'Ferie z dziećmi w górach. W pilnej sprawie jestem pod telefonem.',
  link: 'https://urlopy.firma.pl/admin/leave-requests/128',
};
