import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ArchivedEmployee } from '@app/shared';
import { ConfirmByNameModal } from '../../../common/ConfirmByNameModal';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { notify } from '../../../core/notify';
import { useDeleteEmployee, useRestoreEmployee } from '../archive.api';
import { useArchiveActionError } from '../archiveErrors';

export const RestoreEmployeeModal = ({ employee, onClose }: { employee: ArchivedEmployee; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  const restore = useRestoreEmployee();
  const onError = useArchiveActionError(onClose);
  const confirm = () =>
    restore.mutate(employee.id, {
      onSuccess: () => {
        notify.success(t('restored_employee', { name: employee.name }));
        onClose();
      },
      onError,
    });
  return (
    <ConfirmModal title={t('restore_employee_title')} confirmLabel={t('restore')} confirmAction="restore" loading={restore.isPending} onConfirm={confirm} onClose={onClose}>
      <Text>{t('restore_employee_text', { name: employee.name })}</Text>
    </ConfirmModal>
  );
};

export const DeleteEmployeeModal = ({ employee, onClose }: { employee: ArchivedEmployee; onClose: () => void }) => {
  const { t } = useTranslation('archive');
  const remove = useDeleteEmployee();
  const onError = useArchiveActionError(onClose);
  const confirm = (confirmName: string) =>
    remove.mutate(
      { id: employee.id, confirmName },
      {
        onSuccess: () => {
          notify.success(t('deleted_employee', { name: employee.name }));
          onClose();
        },
        onError,
      },
    );
  return (
    <ConfirmByNameModal
      title={t('delete_employee_title')}
      confirmLabel={t('delete_forever')}
      name={employee.name}
      inputLabel={t('type_name')}
      loading={remove.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>{t('delete_employee_text', { name: employee.name })}</Text>
      {employee.tasks > 0 && <Text size="sm" c="dimmed">{t('delete_employee_tasks', { count: employee.tasks })}</Text>}
    </ConfirmByNameModal>
  );
};
