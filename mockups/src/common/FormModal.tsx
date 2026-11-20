import type { FormEventHandler, ReactNode } from 'react';
import { Button, Group, Modal, Stack, type ModalProps } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ButtonIcon, type ButtonAction } from './ButtonIcon';

/**
 * Okno formularza na środku: pola od modułu, na dole „Anuluj” i przycisk zapisu (Enter też zapisuje). Okno samo się
 * nie zamyka: moduł woła `onClose` po udanym zapisie.
 *
 *   <FormModal title={t('add')} submitLabel={t('save')} submitAction="save" loading={save.isPending}
 *              onSubmit={form.onSubmit(save)} onClose={onClose}>
 *     <TextInput … />
 *   </FormModal>
 */
export const FormModal = ({
  opened = true,
  title,
  size,
  submitLabel,
  submitAction,
  loading = false,
  submitDisabled = false,
  onSubmit,
  onClose,
  children,
}: {
  opened?: boolean;
  title: string;
  size?: ModalProps['size'];
  submitLabel: string;
  submitAction: ButtonAction;
  loading?: boolean;
  submitDisabled?: boolean;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <Modal opened={opened} onClose={onClose} title={title} size={size}>
      <form onSubmit={onSubmit} noValidate>
        <Stack>
          {children}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action={submitAction} />} loading={loading} disabled={submitDisabled}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
