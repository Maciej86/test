import { z } from 'zod';
import { LEAVE_TYPE_COLORS, LEAVE_TYPE_LIMIT_MAX, LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_NAME_MAX, type LeaveTypeColor } from '../constants/leaveTypes';
import { optionalField, personName, wholeNumber } from './fields';

/** Okno „Dodaj typ urlopu” / „Edytuj typ” (POST i PUT /api/leave-types). */
export const leaveTypeSchema = z.object({
  // personName robi dokładnie to, czego trzeba: obcięte spacje, 2–max znaków, puste → wymagane.
  name: personName(LEAVE_TYPE_NAME_MAX),
  deductsPool: z.boolean({ error: 'validation.required' }),
  yearlyLimit: optionalField(wholeNumber(LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_LIMIT_MAX)),
  color: z.enum(LEAVE_TYPE_COLORS, { error: (issue) => (issue.input === undefined ? 'validation.required' : 'validation.invalid_option') }),
});

export type LeaveTypeInput = z.input<typeof leaveTypeSchema>;
export type LeaveTypeData = z.output<typeof leaveTypeSchema>;

/** Wiersz listy typów (GET /api/leave-types). */
export interface LeaveTypeItem {
  id: number;
  name: string;
  deductsPool: boolean;
  yearlyLimit: number | null;
  color: LeaveTypeColor;
  hidden: boolean;
  /** W ilu wnioskach typ jest użyty (liczy moduł Moje urlopy, wszystkie statusy). */
  requestsCount: number;
}

export interface LeaveTypesListResponse {
  items: LeaveTypeItem[];
}

/** Typ do wyboru w formularzu wniosku (tylko widoczne). */
export type SelectableLeaveType = Pick<LeaveTypeItem, 'id' | 'name' | 'deductsPool' | 'yearlyLimit'>;
