import { ARCHIVE_MESSAGES, EMPLOYEE_MESSAGES, SERVER_MESSAGES } from '@app/shared';
import { useTranslation } from 'react-i18next';
import { apiErrorKey, apiErrorMessage, apiErrorStatus } from '../../core/api/client';
import { notify } from '../../core/notify';

/** Odpowiedzi, które znaczą „ktoś już przywrócił albo usunął to w międzyczasie” (lista jest nieaktualna). */
const GONE_KEYS: readonly string[] = [SERVER_MESSAGES.archiveFirst, ARCHIVE_MESSAGES.notArchived, EMPLOYEE_MESSAGES.notArchived];

/** Rekordu nie ma już w archiwum: 404 albo 409 „nie jest w archiwum”. Wtedy okno się zamyka, a lista odświeża. */
export const isGone = (err: unknown): boolean => {
  const status = apiErrorStatus(err);
  return status === 404 || (status === 409 && GONE_KEYS.includes(apiErrorKey(err) ?? ''));
};

/**
 * Błąd akcji w oknie archiwum: rekordu nie ma już w archiwum → dymek „Tej rzeczy nie ma już…” i zamknięcie okna;
 * inny błąd → dymek z komunikatem serwera, okno zostaje (można spróbować ponownie).
 */
export const useArchiveActionError = (onClose: () => void) => {
  const { t } = useTranslation('archive');
  return (error: unknown) => {
    if (isGone(error)) {
      notify.error(t('gone'));
      onClose();
    } else notify.error(apiErrorMessage(error, t));
  };
};
