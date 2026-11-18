import { useState } from 'react';
import { Button, Paper, Stack } from '@mantine/core';
import { FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProjectItem } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { PageHeader } from '../../common/PageHeader';
import { apiErrorMessage } from '../../core/api/client';
import { notify } from '../../core/notify';
import { DeleteProjectModal } from './components/DeleteProjectModal';
import { ProjectModal } from './components/ProjectModal';
import { ProjectsTable } from './components/ProjectsTable';
import { useMoveProject, useProjects } from './tasks.api';

/** „Projekty” (tylko administrator): kolejność strzałkami, członkowie, usuwanie na stałe. */
export const ProjectsPage = () => {
  const { t } = useTranslation('tasks');
  const projects = useProjects();
  const move = useMoveProject();
  const [editing, setEditing] = useState<ProjectItem | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ProjectItem | null>(null);
  const rows = projects.data?.items ?? [];
  const add = <Button leftSection={<ButtonIcon action="add" />} onClick={() => setEditing('new')}>{t('project_new')}</Button>;

  return (
    <Stack>
      <PageHeader title={t('projects_title')} subtitle={t('projects_subtitle')} actions={rows.length > 0 ? add : undefined} />
      <DataState query={projects}>
        {rows.length === 0 ? (
          <Paper withBorder>
            <EmptyState icon={FolderKanban} title={t('projects_empty_title')} text={t('projects_empty')} action={add} />
          </Paper>
        ) : (
          <ProjectsTable
            rows={rows}
            onEdit={setEditing}
            onDelete={setDeleting}
            onMove={(p, direction) => move.mutate({ id: p.id, direction }, { onError: (error) => notify.error(apiErrorMessage(error, t)) })}
          />
        )}
      </DataState>
      {editing && <ProjectModal project={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteProjectModal project={deleting} onClose={() => setDeleting(null)} />}
    </Stack>
  );
};
