import { useCallback } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IDLE_LOGOUT_MS, IDLE_WARNING_MS } from '@app/shared';
import { useAuth } from '../core/auth/AuthProvider';
import { useIdleLogout } from '../core/auth/useIdleLogout';
import { ButtonIcon } from './ButtonIcon';

/** Okno „Zaraz Cię wylogujemy” w panelu i koncie (moduł Logowanie). Zamyka je tylko przycisk. */
export const IdleWarningModal = () => {
  const { t } = useTranslation('login');
  const { logout } = useAuth();
  const onIdle = useCallback(() => void logout('idle'), [logout]);
  const { warning, secondsLeft, stay } = useIdleLogout(onIdle);
  const idleMinutes = (IDLE_LOGOUT_MS - IDLE_WARNING_MS) / 60_000;

  return (
    <Modal
      opened={warning}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      centered
      title={
        <Group gap="xs" wrap="nowrap">
          <Clock size={20} aria-hidden />
          <Text ff="heading" fw={600} fz="lg">{t('idle_warning_title')}</Text>
        </Group>
      }
    >
      <Text mb="lg">{t('idle_warning_text', { minutes: idleMinutes, seconds: secondsLeft })}</Text>
      <Group justify="flex-end">
        <Button variant="default" leftSection={<ButtonIcon action="logout" />} onClick={() => void logout()}>
          {t('idle_logout')}
        </Button>
        <Button leftSection={<ButtonIcon action="confirm" />} onClick={stay} data-autofocus>
          {t('idle_stay')}
        </Button>
      </Group>
    </Modal>
  );
};
