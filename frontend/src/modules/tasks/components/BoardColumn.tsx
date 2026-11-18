import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTranslation } from 'react-i18next';
import type { BoardPerson, BoardTask, TaskColumn } from '@app/shared';
import { columnDropId } from './boardDrop';
import { TaskCard } from './TaskCard';

interface CardActions {
  people: Map<number, BoardPerson>;
  meId: number;
  onOpen: (task: BoardTask) => void;
  onMove: (task: BoardTask, column: TaskColumn) => void;
  onArchive: (task: BoardTask) => void;
}

/** Karta, którą da się przeciągać (myszą i palcem). */
const SortableCard = ({ task, ...actions }: CardActions & { task: BoardTask }) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({ id: task.id });
  return (
    <TaskCard
      task={task}
      people={actions.people}
      meId={actions.meId}
      drag={{ ref: setNodeRef, props: { ...attributes, ...listeners }, style: { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 } }}
      onOpen={() => actions.onOpen(task)}
      onMove={(column) => actions.onMove(task, column)}
      onArchive={() => actions.onArchive(task)}
    />
  );
};

/**
 * Kolumna tablicy (wzorzec „Kolumny tablicy” z DESIGN.md): nagłówek z liczbą kart (przy filtrze „pasujące /
 * wszystkie”), karty do przeciągania, a w „Zrealizowanych” przycisk starszych kart.
 */
export const BoardColumn = ({ column, tasks, total, filtered, showTitle = true, oldDone, ...actions }: CardActions & {
  column: TaskColumn;
  tasks: BoardTask[];
  total: number;
  filtered: boolean;
  showTitle?: boolean;
  oldDone?: { count: number; shown: boolean; onToggle: () => void };
}) => {
  const { t } = useTranslation('tasks');
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(column) });
  const title = t(`column.${column}`);
  return (
    <Paper
      ref={setNodeRef}
      component="section"
      aria-label={title}
      p="sm"
      withBorder
      bg="var(--app-panel-background)"
      mih={160}
      style={{ outline: isOver ? '2px dashed var(--mantine-color-navy-4)' : undefined, outlineOffset: -2 }}
    >
      {showTitle && (
        <Group justify="space-between" mb="sm" wrap="nowrap">
          <Title order={3} size="h4">{title}</Title>
          <Badge variant="light" color="gray" tt="none">{filtered ? `${tasks.length} / ${total}` : total}</Badge>
        </Group>
      )}
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <Stack gap="sm">
          {tasks.map((task) => <SortableCard key={task.id} task={task} {...actions} />)}
          {tasks.length === 0 && (
            <Text size="sm" c="dimmed" ta="center" py="lg">{filtered ? t('column_empty_filtered') : t('column_empty')}</Text>
          )}
        </Stack>
      </SortableContext>
      {oldDone && (oldDone.count > 0 || oldDone.shown) && (
        <Stack gap={2} align="center" mt="sm">
          <Button variant="subtle" size="xs" onClick={oldDone.onToggle}>
            {oldDone.shown ? t('hide_old_done') : t('show_old_done', { count: oldDone.count })}
          </Button>
          {!oldDone.shown && <Text size="xs" c="dimmed">{t('old_done_hint')}</Text>}
        </Stack>
      )}
    </Paper>
  );
};
