import { useState } from 'react';
import { Text, TextInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ProjectItem } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useDeleteProject } from '../tasks.api';

/** „Usunąć projekt na stałe?” (odpowiedź 13): razem z zadaniami; przycisk działa dopiero po wpisaniu nazwy. */
export const DeleteProjectModal = ({ project, onClose }: { project: ProjectItem; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const remove = useDeleteProject();
  const [typed, setTyped] = useState('');
  const confirm = () =>
    remove.mutate(
      { id: project.id, confirmName: typed.trim() },
      {
        onSuccess: () => {
          notify.success(t('project_deleted'));
          onClose();
        },
        onError: (error) => notify.error(apiErrorMessage(error, t)),
      },
    );
  return (
    <ConfirmModal
      title={t('project_delete_title')}
      confirmLabel={t('project_delete')}
      confirmAction="delete"
      danger
      loading={remove.isPending}
      confirmDisabled={typed.trim() !== project.name}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>{t('project_delete_text', { name: project.name, count: project.openCount + project.doneCount + project.archivedCount })}</Text>
      <TextInput label={t('project_delete_confirm_label', { name: project.name })} value={typed} onChange={(e) => setTyped(e.currentTarget.value)} data-autofocus />
    </ConfirmModal>
  );
};
