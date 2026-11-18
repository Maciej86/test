import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { newTaskSchema, taskSchema, type BoardTask, type TaskColumn } from '@app/shared';
import { apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useSaveTask } from '../tasks.api';

export type TaskFormValues = {
  title: string;
  description: string;
  dueDate: string | null;
  column: TaskColumn;
  /** Numery osób jako tekst (tak działa MultiSelect); schemat zamienia je na liczby. */
  assigneeIds: string[];
};

/**
 * Formularz zadania: nowe (termin najwcześniej dziś) albo zmiana istniejącego. Wartości ustawia się raz przy
 * otwarciu, więc odświeżenie tablicy co 5 s nie nadpisuje tego, co osoba właśnie wpisuje.
 */
export const useTaskForm = (projectId: number, task: BoardTask | null, onDone: () => void) => {
  const { t } = useTranslation('tasks');
  const save = useSaveTask(projectId);
  const form = useForm<TaskFormValues>({
    initialValues: {
      title: task?.title ?? '',
      description: task?.description ?? '',
      dueDate: task?.dueDate ?? null,
      column: task?.column ?? 'draft',
      assigneeIds: (task?.assigneeIds ?? []).map(String),
    },
    validate: zod4Resolver(task ? taskSchema : newTaskSchema),
  });
  const submit = form.onSubmit((values) => {
    // Pola, których osoba nie ruszała, biorą najświeższy stan z tablicy: zapis nie cofa przeniesienia karty ani
    // przypisania, które w międzyczasie zrobił ktoś inny.
    const fresh = <K extends keyof TaskFormValues>(key: K, latest: TaskFormValues[K]) => (task && !form.isDirty(key) ? latest : values[key]);
    const input = {
      title: fresh('title', task?.title ?? ''),
      description: fresh('description', task?.description ?? ''),
      dueDate: fresh('dueDate', task?.dueDate ?? null),
      column: fresh('column', task?.column ?? 'draft'),
      assigneeIds: fresh('assigneeIds', (task?.assigneeIds ?? []).map(String)).map(Number),
      ...(task ? { id: task.id } : {}),
    };
    save.mutate(input, {
      onSuccess: () => {
        notify.success(task ? t('saved') : t('added'));
        onDone();
      },
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) form.setErrors(fields);
        else notify.error(apiErrorMessage(error, t));
      },
    });
  });
  return { form, submit, saving: save.isPending };
};

export type TaskForm = ReturnType<typeof useTaskForm>['form'];
