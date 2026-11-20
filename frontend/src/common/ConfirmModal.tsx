import type { ReactNode } from 'react';
import { Button, Group, Modal, Stack, type MantineColor, type ModalProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ButtonIcon, type ButtonAction } from './ButtonIcon';

/**
 * Okno z pytaniem i dwoma przyciskami: „Anuluj” i akcja (np. „Ukryj”, „Do archiwum”). `danger` = czerwony przycisk
 * (usunięcie, archiwum), `confirmColor` = inny kolor (np. zielony przy zatwierdzeniu). Okno samo się nie zamyka: moduł woła `onClose` po udanym zapisie, a przy błędzie zostawia je
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
  cancelLabel,
  danger = false,
  confirmColor,
  loading = false,
  confirmDisabled = false,
  size,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  confirmLabel: string;
  confirmAction: ButtonAction;
  /** Napis zamiast „Anuluj”, np. „Zostaw” przy wycofaniu wniosku. */
  cancelLabel?: string;
  danger?: boolean;
  /** Kolor przycisku akcji, np. `green` przy zatwierdzeniu; ma pierwszeństwo przed `danger`. */
  confirmColor?: MantineColor;
  loading?: boolean;
  /** Przycisk akcji wyłączony, np. dopóki nie wpisano nazwy projektu do usunięcia. */
  confirmDisabled?: boolean;
  /** Szerokość okna, np. `xl` przy podglądzie z tabelą („Zamknij rok”). */
  size?: ModalProps['size'];
  onConfirm: () => void;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <Modal opened onClose={onClose} title={title} size={size}>
      <Stack>
        {children}
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{cancelLabel ?? t('cancel')}</Button>
          <Button color={confirmColor ?? (danger ? 'red' : undefined)} leftSection={<ButtonIcon action={confirmAction} />} loading={loading} disabled={confirmDisabled} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
