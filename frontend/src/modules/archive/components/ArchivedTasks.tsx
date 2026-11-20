import { useState } from 'react';
import { Button, Card, Group, Select, Stack, Table, Text } from '@mantine/core';
import { ListTodo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type ArchivePageParams, type ArchivedTask } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { DateText } from '../../../common/DateText';
import { ListPagination } from '../../../common/ListPagination';
import { SearchField } from '../../../common/SearchField';
import { useArchivedTasks } from '../archive.api';
import { ArchiveEmpty, ArchivedCell } from './ArchiveParts';
import { DeleteTaskModal, RestoreTaskModal } from './TaskModals';
import { TaskPreview } from './TaskPreview';

interface Actions {
  onOpen: (task: ArchivedTask) => void;
  onRestore: (task: ArchivedTask) => void;
  onDelete: (task: ArchivedTask) => void;
}

const Buttons = ({ task, onRestore, onDelete }: Omit<Actions, 'onOpen'> & { task: ArchivedTask }) => {
  const { t } = useTranslation('archive');
  return (
    // Przyciski nie otwierają podglądu (kliknięcie wiersza).
    <Group gap={4} justify="flex-end" wrap="nowrap" onClick={(event) => event.stopPropagation()}>
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="restore" size={14} />} onClick={() => onRestore(task)}>{t('restore')}</Button>
      <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={14} />} onClick={() => onDelete(task)}>{t('delete_forever')}</Button>
    </Group>
  );
};

const Title = ({ task }: { task: ArchivedTask }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text fw={600}>{task.title}</Text>
      {task.comments > 0 && <Text size="xs" c="dimmed">{t('comments', { count: task.comments })}</Text>}
    </Stack>
  );
};

const Where = ({ task }: { task: ArchivedTask }) => {
  const { t } = useTranslation('tasks');
  return (
    <Stack gap={0}>
      <Text size="sm">{task.projectName}</Text>
      <Text size="xs" c="dimmed">{t(`column.${task.column}`)}</Text>
    </Stack>
  );
};

const TasksList = ({ rows, onOpen, ...actions }: Actions & { rows: ArchivedTask[] }) => {
  const { t } = useTranslation('archive');
  return (
    <>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 100} visibleFrom="sm">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_task')}</Table.Th>
              <Table.Th>{t('col_project')}</Table.Th>
              <Table.Th>{t('due')}</Table.Th>
              <Table.Th>{t('col_archived')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((task) => (
              <Table.Tr key={task.id} onClick={() => onOpen(task)} style={{ cursor: 'pointer' }}>
                <Table.Td><Title task={task} /></Table.Td>
                <Table.Td><Where task={task} /></Table.Td>
                <Table.Td><Text size="sm"><DateText value={task.dueDate} /></Text></Table.Td>
                <Table.Td><ArchivedCell at={task.archivedAt} by={task.archivedByName} /></Table.Td>
                <Table.Td><Buttons task={task} {...actions} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Stack gap="sm" hiddenFrom="sm">
        {rows.map((task) => (
          <Card key={task.id} withBorder padding="md" onClick={() => onOpen(task)} style={{ cursor: 'pointer' }}>
            <Stack gap="sm">
              <Title task={task} />
              <Group justify="space-between" align="flex-start">
                <Where task={task} />
                <ArchivedCell at={task.archivedAt} by={task.archivedByName} />
              </Group>
              <Buttons task={task} {...actions} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
};

type Dialog = { kind: 'restore' | 'delete'; task: ArchivedTask };

/** Zakładka „Zadania”: wyszukiwarka, projekt, lista, podgląd (`taskId` w adresie), przywracanie i usuwanie. */
export const ArchivedTasks = ({ params, onChange }: { params: ArchivePageParams; onChange: (next: Partial<ArchivePageParams>) => void }) => {
  const { t } = useTranslation('archive');
  const list = useArchivedTasks({ page: params.page, search: params.search, projectId: params.projectId });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const data = list.data;
  const filtered = params.search !== '' || params.projectId !== undefined;
  // Podgląd siedzi w adresie (`taskId`); otwarcie i zamknięcie nie zmienia strony listy.
  const closePreview = () => onChange({ taskId: undefined, page: params.page });
  // Okno akcji zamyka też podgląd: po przywróceniu albo usunięciu zadania nie ma już czego oglądać.
  const fromPreview = (kind: Dialog['kind']) => (task: ArchivedTask) => {
    closePreview();
    setDialog({ kind, task });
  };
  return (
    <Stack>
      <Group gap="sm" align="flex-end">
        <SearchField label={t('search_tasks')} value={params.search} onChange={(search) => onChange({ search })} w={{ base: '100%', sm: 320 }} />
        <Select
          aria-label={t('project')}
          placeholder={t('all_projects')}
          data={(data?.projects ?? []).map((p) => ({ value: String(p.id), label: p.name }))}
          value={params.projectId !== undefined ? String(params.projectId) : null}
          onChange={(v) => onChange({ projectId: v ? Number(v) : undefined })}
          clearable
          w={{ base: '100%', sm: 240 }}
        />
      </Group>
      <DataState query={list}>
        {data && data.items.length === 0 && (filtered ? <ArchiveEmpty text={t('no_results')} /> : <ArchiveEmpty icon={ListTodo} title={t('empty_tasks_title')} text={t('empty_tasks_text')} />)}
        {data && data.items.length > 0 && (
          <>
            <TasksList
              rows={data.items}
              onOpen={(task) => onChange({ taskId: task.id, page: params.page })}
              onRestore={(task) => setDialog({ kind: 'restore', task })}
              onDelete={(task) => setDialog({ kind: 'delete', task })}
            />
            <ListPagination data={data} page={params.page} onChange={(page) => onChange({ page })} />
          </>
        )}
      </DataState>
      {params.taskId !== undefined && (
        <TaskPreview taskId={params.taskId} onClose={closePreview} onRestore={fromPreview('restore')} onDelete={fromPreview('delete')} />
      )}
      {dialog?.kind === 'restore' && <RestoreTaskModal task={dialog.task} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'delete' && <DeleteTaskModal task={dialog.task} onClose={() => setDialog(null)} />}
    </Stack>
  );
};
