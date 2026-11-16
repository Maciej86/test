import { z } from 'zod';
import { LEAVE_TYPE_DIRECTIONS, LEAVE_TYPE_LIMIT_MAX, LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_NAME_MAX } from '../constants/leaveTypes';
import { optionalField, personName, wholeNumber } from './fields';

/** Okno „Dodaj typ urlopu” / „Edytuj typ” (POST i PUT /api/leave-types). */
export const leaveTypeSchema = z.object({
  // personName robi dokładnie to, czego trzeba: obcięte spacje, 2–max znaków, puste → wymagane.
  name: personName(LEAVE_TYPE_NAME_MAX),
  deductsPool: z.boolean({ error: 'validation.required' }),
  yearlyLimit: optionalField(wholeNumber(LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_LIMIT_MAX)),
});

/** Strzałki kolejności (POST /api/leave-types/:id/move). */
export const leaveTypeMoveSchema = z.object({ direction: z.enum(LEAVE_TYPE_DIRECTIONS) });

export type LeaveTypeInput = z.input<typeof leaveTypeSchema>;
export type LeaveTypeData = z.output<typeof leaveTypeSchema>;
export type LeaveTypeMoveInput = z.output<typeof leaveTypeMoveSchema>;

/** Wiersz listy typów (GET /api/leave-types). */
export interface LeaveTypeItem {
  id: number;
  name: string;
  deductsPool: boolean;
  yearlyLimit: number | null;
  hidden: boolean;
  /** W ilu wnioskach typ jest użyty (liczy moduł Moje urlopy; do tego czasu 0). */
  requestsCount: number;
}

export interface LeaveTypesListResponse {
  items: LeaveTypeItem[];
}

/** Typ do wyboru w formularzu wniosku (tylko widoczne). */
export type SelectableLeaveType = Pick<LeaveTypeItem, 'id' | 'name' | 'deductsPool' | 'yearlyLimit'>;
