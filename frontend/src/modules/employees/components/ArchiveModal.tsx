import { List, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { EmployeeListItem } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useArchiveEmployee } from '../employees.api';

/**
 * Potwierdzenie „Do archiwum”. Liczby czekających wniosków i zadań dopiszą moduły „Moje urlopy” i „Zadania”
 * (SPEC.md, „Powiązania”).
 */
export const ArchiveModal = ({ employee, onClose }: { employee: EmployeeListItem; onClose: () => void }) => {
  const { t } = useTranslation('employees');
  const archive = useArchiveEmployee();
  const confirm = () =>
    archive.mutate(employee.id, {
      onSuccess: () => { notify.success(t('archived')); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });

  return (
    <ConfirmModal
      title={t('archive_title', { name: employee.name })}
      confirmLabel={t('archive')}
      confirmAction="archive"
      danger
      loading={archive.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <List size="sm" spacing={6}>
        <List.Item>{t('archive_logout')}</List.Item>
        <List.Item>{t('archive_keeps')}</List.Item>
      </List>
      <Text size="sm" c="dimmed">{t('archive_restore_hint')}</Text>
    </ConfirmModal>
  );
};
