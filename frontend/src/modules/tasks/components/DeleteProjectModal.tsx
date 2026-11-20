import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ProjectItem } from '@app/shared';
import { ConfirmByNameModal } from '../../../common/ConfirmByNameModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useDeleteProject } from '../tasks.api';

/** „Usunąć projekt na stałe?” (odpowiedź 13): razem z zadaniami; przycisk działa dopiero po wpisaniu nazwy. */
export const DeleteProjectModal = ({ project, onClose }: { project: ProjectItem; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const remove = useDeleteProject();
  const confirm = (confirmName: string) =>
    remove.mutate(
      { id: project.id, confirmName },
      {
        onSuccess: () => {
          notify.success(t('project_deleted'));
          onClose();
        },
        onError: (error) => notify.error(apiErrorMessage(error, t)),
      },
    );
  return (
    <ConfirmByNameModal
      title={t('project_delete_title')}
      confirmLabel={t('project_delete')}
      name={project.name}
      inputLabel={t('project_delete_confirm_label', { name: project.name })}
      loading={remove.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>{t('project_delete_text', { name: project.name, count: project.openCount + project.doneCount + project.archivedCount })}</Text>
    </ConfirmByNameModal>
  );
};
