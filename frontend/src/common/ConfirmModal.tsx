import type { ReactNode } from 'react';
import { Button, Group, Modal, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ButtonIcon, type ButtonAction } from './ButtonIcon';

/**
 * Okno z pytaniem i dwoma przyciskami: „Anuluj” i akcja (np. „Ukryj”, „Do archiwum”). `danger` = czerwony przycisk
 * (usunięcie, archiwum). Okno samo się nie zamyka: moduł woła `onClose` po udanym zapisie, a przy błędzie zostawia je
 * otwarte, żeby dało się spróbować ponownie.
 *
 *   <ConfirmModal title={t('hide_title')} confirmLabel={t('hide')} confirmAction="hide"
 *                 loading={hide.isPending} onConfirm={confirm} onClose={onClose}>
 *     <Text>{t('hide_text')}</Text>
 *   </ConfirmModal>
 */
export const ConfirmModal = ({
  title,
  confirmLabel,
  confirmAction,
  danger = false,
  loading = false,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  confirmAction: ButtonAction;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <Modal opened onClose={onClose} title={title}>
      <Stack>
        {children}
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button color={danger ? 'red' : undefined} leftSection={<ButtonIcon action={confirmAction} />} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
