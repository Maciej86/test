import { z } from 'zod';
import {
  LEAVE_DECISION_REASON_MAX,
  LEAVE_DECISION_REASON_MIN,
  LEAVE_REQUEST_FILTERS,
  LEAVE_REQUESTS_MESSAGES as M,
  type LeaveRequestFilter,
} from '../constants/leaveRequests';
import { LEAVE_REQUEST_YEAR_MAX, LEAVE_REQUEST_YEAR_MIN, type LeaveRequestStatus } from '../constants/myLeave';
import { addressNumber, text } from './fields';
import { listQuerySchema } from './list';

/** Okna „Odrzucenie wniosku” i „Anulowanie urlopu”: powód obowiązkowy, 3–500 znaków po przycięciu spacji. */
export const leaveDecisionReasonSchema = z.object({
  reason: text(LEAVE_DECISION_REASON_MAX).pipe(z.string().min(LEAVE_DECISION_REASON_MIN, M.reasonMin)),
});

/**
 * Lista wniosków z adresu: zakładka (domyślnie czekające), rok puli (poza „Czekają”; brak = bieżący), typ urlopu,
 * szukanie po pracowniku, strona. Kolejność ustala serwer (odpowiedź 7a), więc jedyna „kolumna sortowania” to stała.
 * Złe wartości z adresu wracają do domyślnych zamiast błędu.
 */
export const leaveRequestsListQuerySchema = listQuerySchema(['default']).extend({
  status: z.enum(LEAVE_REQUEST_FILTERS).catch('pending').default('pending'),
  year: addressNumber.pipe(z.number().min(LEAVE_REQUEST_YEAR_MIN).max(LEAVE_REQUEST_YEAR_MAX)).optional().catch(undefined),
  leaveTypeId: addressNumber.pipe(z.number().max(2_147_483_647)).optional().catch(undefined),
});

export type LeaveDecisionReasonInput = z.input<typeof leaveDecisionReasonSchema>;
export type LeaveRequestsListQuery = {
  page: number;
  search: string;
  status: LeaveRequestFilter;
  year?: number;
  leaveTypeId?: number;
};

/** Wiersz listy „Wnioski urlopowe”. */
export interface LeaveRequestListItem {
  id: number;
  employeeName: string;
  employeeArchived: boolean;
  leaveTypeName: string;
  deductsPool: boolean;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  daysFromCarried: number;
  daysFromAnnual: number;
  poolYear: number;
  comment: string | null;
  status: LeaveRequestStatus;
  decisionReason: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
  /** Dni do wykorzystania w otwartym roku osoby (pula + zaległe − zatwierdzone − czekające); brak puli = null. */
  poolLeft: { left: number; total: number } | null;
  /** Zatwierdzony, a pula roku wniosku jeszcze niezamknięta. */
  canCancel: boolean;
}

export interface LeaveRequestsListResponse {
  items: LeaveRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
  /** Czekające na decyzję (wszystkie lata) i chwila złożenia najstarszego. */
  pendingCount: number;
  oldestPendingAt: string | null;
  /** Lata puli z wnioskami i bieżący rok, od najnowszego. */
  years: number[];
  /** Wszystkie typy (także ukryte) do filtra. */
  leaveTypes: { id: number; name: string }[];
}

/** Szczegóły wniosku: pola z listy, pula roku wniosku (gdy otwarta) i kto jeszcze ma wtedy urlop. */
export interface LeaveRequestDetails extends LeaveRequestListItem {
  pool: { year: number; annualDays: number; carriedDays: number; used: number; pending: number; left: number } | null;
  /** Inne osoby z wnioskiem zatwierdzonym albo czekającym ze wspólnym dniem (tylko przy czekającym i zatwierdzonym). */
  others: { employeeName: string; dateFrom: string; dateTo: string; status: LeaveRequestStatus }[];
}
