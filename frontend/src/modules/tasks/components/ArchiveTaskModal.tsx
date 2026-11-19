import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BoardTask } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useArchiveTask } from '../tasks.api';

/** „Usunąć zadanie?”: zadanie razem z komentarzami trafia do archiwum (przywraca administrator). */
export const ArchiveTaskModal = ({ task, onClose }: { task: BoardTask; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const archive = useArchiveTask();
  const confirm = () =>
    archive.mutate(task.id, {
      onSuccess: () => {
        notify.success(t('archived'));
        onClose();
      },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  return (
    <ConfirmModal title={t('archive_title')} confirmLabel={t('archive_confirm')} confirmAction="delete" danger loading={archive.isPending} onConfirm={confirm} onClose={onClose}>
      <Text>{t('archive_text', { title: task.title, count: task.commentCount })}</Text>
    </ConfirmModal>
  );
};
