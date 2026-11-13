import { createElement } from 'react';
import { notifications } from '@mantine/notifications';
import { Check, X } from 'lucide-react';
import { NOTIFICATION_AUTOCLOSE_MS, NOTIFICATION_ERROR_AUTOCLOSE_MS } from '@app/shared';

/**
 * Dymki po akcjach: po udanym zapisie, usunięciu, wysłaniu i przy błędzie serwera. Tekst zawsze z i18n (`t(...)`).
 * Błędy pól formularza pokazujemy pod polem, nie w dymku. Kopia w makietach i we froncie musi być taka sama.
 */
export const notify = {
  success(message: string) {
    notifications.show({
      message,
      color: 'green',
      icon: createElement(Check, { size: 18 }),
      autoClose: NOTIFICATION_AUTOCLOSE_MS,
    });
  },
  error(message: string) {
    notifications.show({
      message,
      color: 'red',
      icon: createElement(X, { size: 18 }),
      autoClose: NOTIFICATION_ERROR_AUTOCLOSE_MS,
    });
  },
};
