import { Anchor, Avatar, Button, Card, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { TABLE_MIN_WIDTH, taskBoardPath, type OrderDirection, type ProjectItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateText } from '../../../common/DateText';
import { OrderArrows } from '../../../common/OrderArrows';
import { PersonAvatar } from '../../../common/PersonAvatar';

export interface ProjectRowActions {
  onEdit: (project: ProjectItem) => void;
  onDelete: (project: ProjectItem) => void;
  onMove: (project: ProjectItem, direction: OrderDirection) => void;
}

const Members = ({ p }: { p: ProjectItem }) => {
  const { t } = useTranslation('tasks');
  if (p.members.length === 0) return <Text size="sm" c="dimmed">{t('project_no_members')}</Text>;
  return (
    <Tooltip label={p.members.map((m) => m.name).join(', ')} multiline w={260}>
      <Group gap="xs" wrap="nowrap">
        <Avatar.Group spacing={6}>
          {p.members.slice(0, 4).map((m) => (
            <PersonAvatar key={m.id} name={m.name} archived={m.archived} />
          ))}
        </Avatar.Group>
        <Text size="sm" c="dimmed">{t('project_members_count', { count: p.members.length })}</Text>
      </Group>
    </Tooltip>
  );
};

const Actions = ({ p, onEdit, onDelete }: Omit<ProjectRowActions, 'onMove'> & { p: ProjectItem }) => {
  const { t } = useTranslation('tasks');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(p)}>{t('edit')}</Button>
      <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={14} />} onClick={() => onDelete(p)}>{t('delete')}</Button>
    </Group>
  );
};

/** Lista projektów: tabela na komputerze, karty na telefonie (makieta `ProjectsMockup.tsx`). */
export const ProjectsTable = ({ rows, ...actions }: ProjectRowActions & { rows: ProjectItem[] }) => {
  const { t } = useTranslation('tasks');
  const name = (p: ProjectItem) => <Anchor component={Link} to={taskBoardPath(p.id)} fw={600}>{p.name}</Anchor>;
  return (
    <>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={70}>{t('col_order')}</Table.Th>
              <Table.Th>{t('col_project')}</Table.Th>
              <Table.Th>{t('col_members')}</Table.Th>
              <Table.Th>{t('col_tasks')}</Table.Th>
              <Table.Th>{t('col_created')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((p, i) => (
              <Table.Tr key={p.id}>
                <Table.Td><OrderArrows index={i} count={rows.length} onMove={(d) => actions.onMove(p, d)} /></Table.Td>
                <Table.Td>{name(p)}</Table.Td>
                <Table.Td><Members p={p} /></Table.Td>
                <Table.Td>
                  <Text size="sm">{t('project_open', { count: p.openCount })}</Text>
                  <Text size="xs" c="dimmed">{t('project_done', { count: p.doneCount })}</Text>
                </Table.Td>
                <Table.Td c="dimmed"><DateText value={p.createdAt} /></Table.Td>
                <Table.Td><Actions p={p} {...actions} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Stack gap="sm" hiddenFrom="sm">
        {rows.map((p, i) => (
          <Card key={p.id} withBorder padding="md">
            <Stack gap="xs">
              <Group justify="space-between" wrap="nowrap">
                {name(p)}
                <OrderArrows index={i} count={rows.length} onMove={(d) => actions.onMove(p, d)} />
              </Group>
              <Members p={p} />
              <Text size="sm" c="dimmed">{t('project_open', { count: p.openCount })}, {t('project_done', { count: p.doneCount })}</Text>
              <Actions p={p} {...actions} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
};
