import { useEffect, useState } from 'react';
import { Anchor, Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Switch, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent, type DragOverEvent } from '@dnd-kit/core';
import { SquareKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { TASK_COLUMNS, boardViewSchema, type BoardResponse, type BoardTask, type TaskColumn } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { EmptyState } from '../../common/EmptyState';
import { SearchField } from '../../common/SearchField';
import { apiErrorKey, apiErrorMessage } from '../../core/api/client';
import { useAuth } from '../../core/auth/AuthProvider';
import { notify } from '../../core/notify';
import { useListParams } from '../../core/useListParams';
import { ArchiveTaskModal } from './components/ArchiveTaskModal';
import { BoardColumn } from './components/BoardColumn';
import { BoardHeader } from './components/BoardHeader';
import { dragTarget, placementOf } from './components/boardDrop';
import { TaskDrawer } from './components/TaskDrawer';
import { TaskFormModal } from './components/TaskFormModal';
import { columnTasks, moveInBoard } from './boardMove';
import { useBoard, useMoveTask } from './tasks.api';
import { dueState } from './taskDue';

const PROJECT_ID = /^[1-9]\d{0,9}$/;
/** Na węższym ekranie (telefon, mały tablet) widać jedną kolumnę naraz. */
const PHONE_QUERY = '(max-width: 62em)';
const DEFAULT_PHONE_COLUMN: TaskColumn = 'in_progress';

const NoAccess = () => {
  const { t } = useTranslation('tasks');
  return (
    <Paper withBorder>
      <EmptyState icon={SquareKanban} text={t('no_access')} action={<Anchor component={Link} to="/admin">{t('back_to_dashboard')}</Anchor>} />
    </Paper>
  );
};

/** Tablica gotowa do pokazania (dane już są). */
const Board = ({ projectId, data, oldDone, onOldDone }: { projectId: number; data: BoardResponse; oldDone: boolean; onOldDone: () => void }) => {
  const { t } = useTranslation('tasks');
  const { user } = useAuth();
  const [view, setView] = useListParams(boardViewSchema, { search: '', mine: false, task: undefined });
  const phone = useMediaQuery(PHONE_QUERY) ?? false;
  const [phoneColumn, setPhoneColumn] = useState<TaskColumn>(DEFAULT_PHONE_COLUMN);
  // W trakcie przeciągania tablica nie przyjmuje odświeżeń z serwera (karta nie ucieka spod palca).
  const [dragTasks, setDragTasks] = useState<BoardTask[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<BoardTask | null>(null);
  const openTask = view.task === undefined ? null : (data.tasks.find((task) => task.id === view.task) ?? null);
  const missingTask = view.task !== undefined && openTask === null;
  // Zadanie z adresu (link z powiadomienia) nie jest na tablicy: usunięte, w archiwum albo z innego projektu.
  useEffect(() => {
    if (!missingTask) return;
    notify.error(t('task_not_found'));
    setView({ task: undefined });
  }, [missingTask, setView, t]);
  const move = useMoveTask(projectId, oldDone);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const meId = user?.id ?? 0;
  const tasks = dragTasks ?? data.tasks;
  const people = new Map(data.people.map((p) => [p.id, p]));
  const query = view.search.toLowerCase();
  const filtered = view.mine || query !== '';
  const matches = (task: BoardTask) =>
    (!view.mine || task.assigneeIds.includes(meId)) &&
    (query === '' || task.title.toLowerCase().includes(query) || (task.description ?? '').toLowerCase().includes(query));
  const open = data.tasks.filter((task) => task.column !== 'done');

  const sendMove = (task: BoardTask, column: TaskColumn, beforeTaskId: number | null) =>
    move.mutate({ taskId: task.id, column, beforeTaskId }, { onError: (error) => notify.error(apiErrorMessage(error, t)) });

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !dragTasks) return;
    const target = dragTarget(dragTasks, Number(active.id), over.id);
    if (target) setDragTasks(moveInBoard(dragTasks, Number(active.id), target));
  };
  const onDragEnd = ({ active }: DragEndEvent) => {
    const id = Number(active.id);
    const task = data.tasks.find((x) => x.id === id);
    if (dragTasks && task) {
      const before = placementOf(data.tasks, id);
      const after = placementOf(dragTasks, id);
      if (before.column !== after.column || before.beforeTaskId !== after.beforeTaskId) sendMove(task, after.column, after.beforeTaskId);
    }
    setDragTasks(null);
  };

  const actions = {
    people,
    meId,
    onOpen: (task: BoardTask) => setView({ task: task.id }),
    onMove: (task: BoardTask, column: TaskColumn) => sendMove(task, column, null),
    onArchive: (task: BoardTask) => setArchiving(task),
  };
  const column = (key: TaskColumn, showTitle: boolean) => {
    const all = columnTasks(tasks, key);
    return (
      <BoardColumn
        key={key}
        column={key}
        tasks={all.filter(matches)}
        total={all.length}
        filtered={filtered}
        showTitle={showTitle}
        oldDone={key === 'done' ? { count: data.oldDoneCount, shown: oldDone, onToggle: onOldDone } : undefined}
        {...actions}
      />
    );
  };

  return (
    <Stack>
      <BoardHeader
        name={data.project.name}
        empty={data.tasks.length === 0}
        openCount={open.length}
        overdue={open.filter((task) => dueState(task) === 'overdue').length}
        people={data.people}
        onAdd={() => setCreating(true)}
      />
      <Group gap="md" align="center">
        <SearchField label={t('search')} value={view.search} onChange={(search) => setView({ search })} w={{ base: '100%', sm: 260 }} />
        <Switch label={t('only_mine')} checked={view.mine} onChange={(e) => setView({ mine: e.currentTarget.checked })} />
      </Group>

      {data.tasks.length === 0 && !oldDone ? (
        <Paper withBorder>
          <EmptyState
            icon={SquareKanban}
            title={t('board_empty_title')}
            text={t('board_empty', { project: data.project.name })}
            action={<Button leftSection={<ButtonIcon action="add" />} onClick={() => setCreating(true)}>{t('new_task')}</Button>}
          />
        </Paper>
      ) : (
        <DndContext sensors={sensors} onDragStart={() => setDragTasks(data.tasks)} onDragOver={onDragOver} onDragEnd={onDragEnd} onDragCancel={() => setDragTasks(null)}>
          {phone ? (
            <Stack gap="sm">
              <SegmentedControl
                fullWidth
                value={phoneColumn}
                onChange={(v) => setPhoneColumn(v as TaskColumn)}
                data={TASK_COLUMNS.map((c) => ({ value: c, label: `${t(`column.${c}`)} (${columnTasks(tasks, c).filter(matches).length})` }))}
              />
              {column(phoneColumn, false)}
            </Stack>
          ) : (
            <>
              <SimpleGrid cols={3} spacing="md" style={{ alignItems: 'start' }}>
                {TASK_COLUMNS.map((key) => column(key, true))}
              </SimpleGrid>
              <Text size="sm" c="dimmed">{t('drag_hint')}</Text>
            </>
          )}
        </DndContext>
      )}

      {creating && <TaskFormModal projectId={projectId} board={data} onClose={() => setCreating(false)} />}
      {openTask && (
        <TaskDrawer
          key={openTask.id}
          projectId={projectId}
          board={data}
          task={openTask}
          onClose={() => setView({ task: undefined })}
          onArchive={(task) => { setView({ task: undefined }); setArchiving(task); }}
        />
      )}
      {archiving && <ArchiveTaskModal task={archiving} onClose={() => setArchiving(null)} />}
    </Stack>
  );
};

/**
 * Tablica projektu `/admin/tasks/:projectId` (makieta `TasksMockup.tsx`): trzy kolumny z przeciąganiem, na telefonie
 * jedna naraz. Projekt, którego osoba nie widzi (albo usunięty), daje komunikat braku dostępu.
 */
export const TaskBoardPage = () => {
  const { projectId: raw } = useParams();
  const projectId = raw !== undefined && PROJECT_ID.test(raw) ? Number(raw) : null;
  return projectId === null ? <NoAccess /> : <BoardLoader key={projectId} projectId={projectId} />;
};

const BoardLoader = ({ projectId }: { projectId: number }) => {
  const [oldDone, setOldDone] = useState(false);
  const board = useBoard(projectId, oldDone);
  if (apiErrorKey(board.error) === 'server.not_found') return <NoAccess />;
  return (
    <DataState query={board}>
      {board.data && <Board projectId={projectId} data={board.data} oldDone={oldDone} onOldDone={() => setOldDone((v) => !v)} />}
    </DataState>
  );
};
