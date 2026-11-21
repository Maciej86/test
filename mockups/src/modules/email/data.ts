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

/** Ten sam e-mail dla typu bez zatwierdzania: chorobowe zgłoszone 2 dni wstecz, od razu zatwierdzone. */
export const REPORTED_EMAIL = {
  ...NEW_REQUEST_EMAIL,
  sentAt: '2026-11-17T07:15:00',
  employee: 'Tomasz Wójcik',
  leaveType: 'Chorobowe',
  dateFrom: '2026-11-15',
  dateTo: '2026-11-21',
  workingDays: 7,
  comment: '',
  link: 'https://urlopy.firma.pl/admin/leave-requests/131',
};
