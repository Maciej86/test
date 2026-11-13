import { Avatar, Badge, Button, Card, Group, Modal, MultiSelect, Paper, SimpleGrid, Stack, Switch, Text, Textarea, TextInput, Title, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CalendarDays, GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { COLUMNS, EMPLOYEES, TASKS } from './data';

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('');
}

export function TasksMockup() {
  const { t } = useTranslation('tasks');
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Stack>

      <Group justify="space-between">
        <Title order={2}>{t('title')}</Title>
        <Group>
          <Switch label={t('only_mine')} />
          <TextInput placeholder={t('search')} w={220} />
          <Button onClick={open}>{t('new_task')}</Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {COLUMNS.map((column) => {
          const tasks = TASKS.filter((task) => task.column === column);
          return (
            <Paper key={column} p="sm" withBorder bg="gray.0">
              <Group justify="space-between" mb="sm">
                <Text fw={600}>{t(`column.${column}`)}</Text>
                <Badge variant="light" color="gray">{tasks.length}</Badge>
              </Group>
              <Stack gap="sm">
                {tasks.map((task) => (
                  <Card key={task.id} withBorder padding="sm" style={{ cursor: 'grab' }}>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <Text c="dimmed" mt={2}><GripVertical size={16} /></Text>
                      <Stack gap={6} style={{ flex: 1 }}>
                        <Text fw={500} size="sm">{task.title}</Text>
                        {task.description && <Text size="xs" c="dimmed" lineClamp={2}>{task.description}</Text>}
                        <Group justify="space-between">
                          {task.due ? (
                            <Group gap={4} c={task.overdue ? 'red.7' : 'dimmed'}>
                              <CalendarDays size={14} />
                              <Text size="xs" c="inherit"><DateText value={task.due} /></Text>
                            </Group>
                          ) : <span />}
                          <Avatar.Group spacing="xs">
                            {task.people.map((p) => (
                              <Tooltip key={p} label={p}>
                                <Avatar size="sm" radius="xl" color="blue">{initials(p)}</Avatar>
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                        </Group>
                      </Stack>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </Paper>
          );
        })}
      </SimpleGrid>
      <Group justify="space-between">
        <Text size="sm" c="dimmed">{t('drag_hint')}</Text>
        <Button variant="subtle" size="xs">{t('show_old_done')}</Button>
      </Group>

      <Modal opened={opened} onClose={close} title={t('new_task')}>
        <Stack>
          <TextInput label={t('field_title')} />
          <Textarea label={t('field_description')} autosize minRows={3} />
          <TextInput label={t('field_due')} placeholder="DD.MM.RRRR" />
          <MultiSelect label={t('field_people')} data={EMPLOYEES} searchable />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>{t('cancel')}</Button>
            <Button onClick={close}>{t('save')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
