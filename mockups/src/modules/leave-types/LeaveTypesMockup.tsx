import { Badge, Button, Group, Modal, Stack, Switch, Table, Text, TextInput, NumberInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { LEAVE_TYPES } from './data';

export function LeaveTypesMockup() {
  const { t } = useTranslation('leave-types');
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{t('title')}</Title>
        <Button onClick={open}>{t('add')}</Button>
      </Group>
      <Table.ScrollContainer minWidth={520}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_name')}</Table.Th>
              <Table.Th>{t('col_deducts')}</Table.Th>
              <Table.Th>{t('col_limit')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {LEAVE_TYPES.map((lt) => (
              <Table.Tr key={lt.id}>
                <Table.Td fw={500}>{lt.name}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={lt.deducts ? 'blue' : 'gray'}>{lt.deducts ? t('yes') : t('no')}</Badge>
                </Table.Td>
                <Table.Td>{'limit' in lt ? t('limit_days', { count: lt.limit }) : <Text span c="dimmed">{t('no_limit')}</Text>}</Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end">
                    <Button size="xs" variant="subtle">{t('edit')}</Button>
                    <Button size="xs" variant="subtle" color="gray">{t('hide')}</Button>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Modal opened={opened} onClose={close} title={t('add')}>
        <Stack>
          <TextInput label={t('col_name')} />
          <Switch label={t('col_deducts')} defaultChecked />
          <NumberInput label={t('col_limit')} description={t('limit_hint')} min={0} />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>{t('cancel')}</Button>
            <Button onClick={close}>{t('save')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
