import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { employeePasswordSchema, type EmployeeListItem, type EmployeePasswordInput } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useSetEmployeePassword } from '../employees.api';
import { PasswordField } from './PasswordField';

/** Nowe hasło tymczasowe; stare przestaje działać od razu. */
export function PasswordModal({ employee, onClose }: { employee: EmployeeListItem; onClose: () => void }) {
  const { t } = useTranslation('employees');
  const setPassword = useSetEmployeePassword();
  const form = useForm<EmployeePasswordInput>({ initialValues: { password: '' }, validate: zod4Resolver(employeePasswordSchema) });

  const submit = form.onSubmit(({ password }) => {
    setPassword.mutate(
      { id: employee.id, password },
      {
        onSuccess: () => { notify.success(t('password_saved')); onClose(); },
        onError: (error) => notify.error(apiErrorMessage(error, t)),
      },
    );
  });

  return (
    <Modal opened onClose={onClose} title={t('password_title', { name: employee.name })}>
      <form onSubmit={submit} noValidate>
        <Stack>
          <Text size="sm">{t('password_intro', { name: employee.name })}</Text>
          <PasswordField
            value={form.values.password}
            error={fieldError(t, form.errors.password)}
            onChange={(v) => form.setFieldValue('password', v)}
          />
          <Group justify="flex-end">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action="password" />} loading={setPassword.isPending}>
              {t('password_save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
