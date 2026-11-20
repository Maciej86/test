import { ARCHIVE_MESSAGES, EMPLOYEE_MESSAGES, SERVER_MESSAGES } from '@app/shared';
import { apiErrorKey, apiErrorStatus } from '../../core/api/client';

/** Odpowiedzi, które znaczą „ktoś już przywrócił albo usunął to w międzyczasie” (lista jest nieaktualna). */
const GONE_KEYS: readonly string[] = [SERVER_MESSAGES.archiveFirst, ARCHIVE_MESSAGES.notArchived, EMPLOYEE_MESSAGES.notArchived];

/** Rekordu nie ma już w archiwum: 404 albo 409 „nie jest w archiwum”. Wtedy okno się zamyka, a lista odświeża. */
export const isGone = (err: unknown): boolean => {
  const status = apiErrorStatus(err);
  return status === 404 || (status === 409 && GONE_KEYS.includes(apiErrorKey(err) ?? ''));
};
