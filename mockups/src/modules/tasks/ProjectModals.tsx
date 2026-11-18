import { useState } from 'react';
import { Alert, Button, Group, Modal, MultiSelect, Stack, Text, TextInput } from '@mantine/core';
import { UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { notify } from '../../common/notify';
import { EMPLOYEES, TASKS, openTasksOf, type MockProject } from './data';

/**
 * Nowy projekt (`project` = null) albo zmiana nazwy i członków. `showError` = stan makiety „nazwa już jest”,
 * `removeMember` = stan makiety „usuwam osobę, która ma otwarte zadania”.
 */
export const ProjectModal = ({ project, showError = false, removeMember, onClose }: {
  project: MockProject | null;
  showError?: boolean;
  removeMember?: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation('tasks');
  const [name, setName] = useState(showError ? 'Marketing' : project?.name ?? '');
  const [members, setMembers] = useState<string[]>((project?.members ?? []).filter((m) => m !== removeMember));
  const removed = project ? project.members.filter((m) => !members.includes(m)) : [];
  const warnings = removed.map((m) => ({ name: m, count: openTasksOf(project!.id, m).length })).filter((w) => w.count > 0);
  // Osoba z archiwum zostaje na liście członków, dopóki ktoś jej nie usunie; nowej nie da się dodać.
  const options = [...EMPLOYEES, ...members.filter((m) => !EMPLOYEES.includes(m))];

  return (
    <Modal opened onClose={onClose} title={project ? t('project_edit_title', { name: project.name }) : t('project_new')} size="lg">
      <Stack>
        <TextInput
          label={t('project_field_name')}
          description={t('project_field_name_hint')}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          error={showError && t('project_error_duplicate')}
          required
          data-autofocus
        />
        <MultiSelect
          label={t('project_field_members')}
          description={t('project_field_members_hint')}
          placeholder={members.length === 0 ? t('field_people_placeholder') : undefined}
          data={options.map((p) => ({ value: p, label: p, disabled: !EMPLOYEES.includes(p) }))}
          value={members}
          onChange={setMembers}
          searchable
          hidePickedOptions
        />
        {warnings.length > 0 && (
          <Alert variant="light" color="yellow" icon={<UserMinus size={18} />} title={t('project_remove_title')}>
            <Stack gap={2}>
              {warnings.map((w) => (
                <Text key={w.name} size="sm">{t('project_remove_text', { name: w.name, count: w.count })}</Text>
              ))}
            </Stack>
          </Alert>
        )}
        <Group justify="flex-end" mt="sm">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button
            leftSection={<ButtonIcon action={project ? 'save' : 'add'} />}
            onClick={() => { notify.success(project ? t('project_saved') : t('project_added')); onClose(); }}
          >
            {project ? t('save') : t('project_add')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

/** Usunięcie na stałe: razem z zadaniami i komentarzami, więc trzeba wpisać nazwę projektu. */
export const DeleteProjectModal = ({ project, onClose }: { project: MockProject; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const [typed, setTyped] = useState('');
  const count = TASKS.filter((task) => task.projectId === project.id).length;
  return (
    <ConfirmModal
      title={t('project_delete_title')}
      confirmLabel={t('project_delete')}
      confirmAction="delete"
      danger
      confirmDisabled={typed.trim() !== project.name}
      onConfirm={() => { notify.success(t('project_deleted')); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('project_delete_text', { name: project.name, count })}</Text>
      <TextInput label={t('project_delete_confirm_label', { name: project.name })} value={typed} onChange={(e) => setTyped(e.currentTarget.value)} data-autofocus />
    </ConfirmModal>
  );
};
