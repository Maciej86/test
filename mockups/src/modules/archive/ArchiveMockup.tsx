import { Button, Group, Stack, Table, Tabs, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { ARCHIVED_EMPLOYEES, ARCHIVED_TASKS } from './data';

function Actions() {
  const { t } = useTranslation('archive');
  return (
    <Group gap="xs" justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle">{t('restore')}</Button>
      <Button size="xs" variant="subtle" color="red">{t('delete_forever')}</Button>
    </Group>
  );
}

export function ArchiveMockup() {
  const { t } = useTranslation('archive');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <Tabs defaultValue="employees">
        <Tabs.List>
          <Tabs.Tab value="employees">{t('employees', { count: ARCHIVED_EMPLOYEES.length })}</Tabs.Tab>
          <Tabs.Tab value="tasks">{t('tasks', { count: ARCHIVED_TASKS.length })}</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="employees" pt="md">
          <Table.ScrollContainer minWidth={600}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('col_name')}</Table.Th>
                  <Table.Th>{t('col_login')}</Table.Th>
                  <Table.Th>{t('col_archived')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ARCHIVED_EMPLOYEES.map((e) => (
                  <Table.Tr key={e.id}>
                    <Table.Td>{e.name}</Table.Td>
                    <Table.Td>{e.login}</Table.Td>
                    <Table.Td><DateText value={e.archivedAt} /></Table.Td>
                    <Table.Td><Actions /></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Tabs.Panel>
        <Tabs.Panel value="tasks" pt="md">
          <Table.ScrollContainer minWidth={600}>
            <Table striped>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t('col_task')}</Table.Th>
                  <Table.Th>{t('col_by')}</Table.Th>
                  <Table.Th>{t('col_archived')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ARCHIVED_TASKS.map((task) => (
                  <Table.Tr key={task.id}>
                    <Table.Td>{task.title}</Table.Td>
                    <Table.Td>{task.by}</Table.Td>
                    <Table.Td><DateText value={task.archivedAt} /></Table.Td>
                    <Table.Td><Actions /></Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
