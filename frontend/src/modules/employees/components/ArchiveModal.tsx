import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { EmployeeListItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useArchiveEmployee } from '../employees.api';

/**
 * Potwierdzenie „Do archiwum”. Liczby czekających wniosków i zadań dopiszą moduły „Moje urlopy” i „Zadania”
 * (SPEC.md, „Powiązania”).
 */
export function ArchiveModal({ employee, onClose }: { employee: EmployeeListItem; onClose: () => void }) {
  const { t } = useTranslation('employees');
  const archive = useArchiveEmployee();
  const confirm = () =>
    archive.mutate(employee.id, {
      onSuccess: () => { notify.success(t('archived')); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });

  return (
    <Modal opened onClose={onClose} title={t('archive_title', { name: employee.name })}>
      <Stack>
        <List size="sm" spacing={6}>
          <List.Item>{t('archive_logout')}</List.Item>
          <List.Item>{t('archive_keeps')}</List.Item>
        </List>
        <Text size="sm" c="dimmed">{t('archive_restore_hint')}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button color="red" leftSection={<ButtonIcon action="archive" />} loading={archive.isPending} onClick={confirm}>
            {t('archive')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
