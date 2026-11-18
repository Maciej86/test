import { Alert, Button, Group, Modal, MultiSelect, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { UserMinus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { projectSchema, type ProjectItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useProjectCandidates, useSaveProject } from '../tasks.api';

type ProjectFormValues = { name: string; memberIds: string[] };

/**
 * Okno „Dodaj projekt” (`project` = null) albo zmiana nazwy i członków. Usuwana osoba z otwartymi zadaniami: żółta
 * ramka z ich liczbą (osoba zniknie z tych zadań, odpowiedź 14a).
 */
export const ProjectModal = ({ project, onClose }: { project: ProjectItem | null; onClose: () => void }) => {
  const { t } = useTranslation('tasks');
  const candidates = useProjectCandidates(true);
  const save = useSaveProject();
  const form = useForm<ProjectFormValues>({
    initialValues: { name: project?.name ?? '', memberIds: (project?.members ?? []).map((m) => String(m.id)) },
    validate: zod4Resolver(projectSchema),
  });
  const values = form.getValues();
  const current = project?.members ?? [];
  // Członek z archiwum zostaje na liście, dopóki ktoś go nie usunie; nowego z archiwum nie da się dodać.
  const options = [
    ...(candidates.data ?? []).map((c) => ({ value: String(c.id), label: c.name })),
    ...current.filter((m) => !(candidates.data ?? []).some((c) => c.id === m.id)).map((m) => ({ value: String(m.id), label: m.name, disabled: true })),
  ];
  const removed = current.filter((m) => m.openTasks > 0 && !values.memberIds.includes(String(m.id)));

  const submit = form.onSubmit((v) => {
    const input = { name: v.name, memberIds: v.memberIds.map(Number), ...(project ? { id: project.id } : {}) };
    save.mutate(input, {
      onSuccess: () => {
        notify.success(project ? t('project_saved') : t('project_added'));
        onClose();
      },
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) form.setErrors(fields);
        else notify.error(apiErrorMessage(error, t));
      },
    });
  });

  return (
    <Modal opened onClose={onClose} title={project ? t('project_edit_title', { name: project.name }) : t('project_new')} size="lg">
      <form onSubmit={submit} noValidate>
        <Stack>
          <TextInput
            label={t('project_field_name')}
            description={t('project_field_name_hint')}
            withAsterisk
            autoComplete="off"
            data-autofocus
            {...form.getInputProps('name')}
            error={fieldError(t, form.errors.name)}
          />
          <MultiSelect
            label={t('project_field_members')}
            description={t('project_field_members_hint')}
            placeholder={values.memberIds.length === 0 ? t('field_people_placeholder') : undefined}
            data={options}
            searchable
            hidePickedOptions
            {...form.getInputProps('memberIds')}
            error={fieldError(t, form.errors.memberIds)}
          />
          {removed.length > 0 && (
            <Alert variant="light" color="yellow" icon={<UserMinus size={18} />} title={t('project_remove_title')}>
              <Stack gap={2}>
                {removed.map((m) => (
                  <Text key={m.id} size="sm">{t('project_remove_text', { name: m.name, count: m.openTasks })}</Text>
                ))}
              </Stack>
            </Alert>
          )}
          <Group justify="flex-end" mt="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action={project ? 'save' : 'add'} />} loading={save.isPending}>
              {project ? t('save') : t('project_add')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
