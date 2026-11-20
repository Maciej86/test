import { LEAVE_REQUEST_STATUSES } from './myLeave';

/** Wnioski urlopowe: decyzje administratora (zatwierdź, odrzuć, anuluj). */

/** Powód odrzucenia albo anulowania: 3–500 znaków (VARCHAR(500) w bazie, kolumna decision_reason). */
export const LEAVE_DECISION_REASON_MIN = 3;
export const LEAVE_DECISION_REASON_MAX = 500;

/** Zakładki listy: każdy status albo wszystkie. */
export const LEAVE_REQUEST_FILTERS = [...LEAVE_REQUEST_STATUSES, 'all'] as const;
export type LeaveRequestFilter = (typeof LEAVE_REQUEST_FILTERS)[number];

/** Klucze błędów modułu (teksty w shared/locales/pl/leave-requests.json, sekcje server i validation). */
export const LEAVE_REQUESTS_MESSAGES = {
  alreadyDecided: 'leave-requests.server.already_decided',
  notApproved: 'leave-requests.server.not_approved',
  yearClosed: 'leave-requests.server.year_closed',
  reasonMin: 'leave-requests.validation.reason_min',
} as const;

/** Lista wniosków i szczegóły jednego wniosku (administrator). */
export const LEAVE_REQUESTS_PATH = '/admin/leave-requests';
export const leaveRequestPath = (id: number): string => `${LEAVE_REQUESTS_PATH}/${id}`;
