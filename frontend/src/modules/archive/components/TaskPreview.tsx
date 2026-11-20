import { useEffect, useRef } from 'react';
import { Alert, Badge, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDateTime, type ArchivedTask } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { DateText } from '../../../common/DateText';
import { PersonAvatar } from '../../../common/PersonAvatar';
import { SideDrawer } from '../../../common/SideDrawer';
import { notify } from '../../../core/notify';
import { useArchivedTask } from '../archive.api';
import { isGone } from '../archiveErrors';

/** Kółko i imię osoby; w archiwum albo usunięta na stałe: szare, ze znacznikiem „w archiwum”. */
const Person = ({ name, archived }: { name: string; archived: boolean }) => {
  const { t } = useTranslation('archive');
  return (
    <Group gap={8} wrap="nowrap">
      <PersonAvatar name={name} archived={archived} />
      <Text size="sm" c={archived ? 'dimmed' : undefined}>{name}</Text>
      {archived && <Badge size="xs" variant="light" color="gray">{t('archived_person')}</Badge>}
    </Group>
  );
};

/**
 * Podgląd zadania z archiwum z prawej (na telefonie cały ekran), tylko do oglądania (odpowiedź 4a). Zadania nie ma
 * już w archiwum: dymek i zamknięcie podglądu.
 */
export const TaskPreview = ({ taskId, onClose, onRestore, onDelete }: {
  taskId: number;
  onClose: () => void;
  onRestore: (task: ArchivedTask) => void;
  onDelete: (task: ArchivedTask) => void;
}) => {
  const { t } = useTranslation('archive');
  const { t: tTasks } = useTranslation('tasks');
  const query = useArchivedTask(taskId);
  const task = query.data;
  const gone = query.isError && isGone(query.error);
  // Jeden dymek, nawet gdy zamknięcie trwa kilka rysowań (adres zmienia się z opóźnieniem).
  const reported = useRef(false);
  useEffect(() => {
    if (!gone || reported.current) return;
    reported.current = true;
    notify.error(t('gone'));
    onClose();
  }, [gone, onClose, t]);

  return (
    <SideDrawer title={t('task_details')} onClose={onClose}>
      <DataState query={query}>
        {task && (
          <Stack>
            <Alert variant="light" color="gray" icon={<Info size={18} />}>{t('read_only')}</Alert>
            <Stack gap={4}>
              <Text ff="heading" fw={600} size="xl">{task.title}</Text>
              <Text size="sm" c="dimmed">{task.projectName} · {tTasks(`column.${task.column}`)}</Text>
            </Stack>
            {task.description && (
              <Stack gap={4}>
                <Text size="sm" fw={600}>{t('description')}</Text>
                <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>{task.description}</Text>
              </Stack>
            )}
            <Group gap="xl" align="flex-start">
              <Stack gap={4}>
                <Text size="sm" fw={600}>{t('due')}</Text>
                <Text size="sm"><DateText value={task.dueDate} /></Text>
              </Stack>
              <Stack gap={6}>
                <Text size="sm" fw={600}>{t('assignees')}</Text>
                {task.assignees.length === 0 ? <Text size="sm" c="dimmed">{t('nobody')}</Text> : task.assignees.map((p) => <Person key={p.name} {...p} />)}
              </Stack>
            </Group>
            <Text size="xs" c="dimmed">
              {t('col_archived')}: {formatDateTime(task.archivedAt)}{task.archivedByName ? `, ${t('archived_by', { name: task.archivedByName })}` : ''}
            </Text>
            <Group justify="space-between">
              <Button variant="subtle" color="red" leftSection={<ButtonIcon action="delete" />} onClick={() => onDelete(task)}>{t('delete_forever')}</Button>
              <Button leftSection={<ButtonIcon action="restore" />} onClick={() => onRestore(task)}>{t('restore')}</Button>
            </Group>
            <Divider my="xs" />
            <Text size="sm" fw={600}>{t('comments_title')}</Text>
            {task.commentsList.length === 0 && <Text size="sm" c="dimmed">{t('no_comments')}</Text>}
            {task.commentsList.map((c) => (
              <Stack key={c.id} gap={4}>
                <Group gap={8}>
                  <Person name={c.authorName} archived={c.authorArchived} />
                  <Text size="xs" c="dimmed">{formatDateTime(c.createdAt)}</Text>
                </Group>
                <Text size="sm" pl={36} style={{ whiteSpace: 'pre-wrap' }}>{c.text}</Text>
              </Stack>
            ))}
          </Stack>
        )}
      </DataState>
    </SideDrawer>
  );
};
