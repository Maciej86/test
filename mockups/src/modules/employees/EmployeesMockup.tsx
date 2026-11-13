import { Badge, Button, Group, Modal, NumberInput, PasswordInput, Select, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { EMPLOYEES } from './data';

export function EmployeesMockup() {
  const { t } = useTranslation('employees');
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <Stack>

      <Group justify="space-between">
        <Title order={2}>{t('title')}</Title>
        <Group>
          <TextInput placeholder={t('search')} w={220} />
          <Button variant="default">{t('close_year')}</Button>
          <Button onClick={open}>{t('add')}</Button>
        </Group>
      </Group>

      <Table.ScrollContainer minWidth={860}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_name')}</Table.Th>
              <Table.Th>{t('col_login')}</Table.Th>
              <Table.Th>{t('col_notify')}</Table.Th>
              <Table.Th>{t('col_role')}</Table.Th>
              <Table.Th>{t('col_pool')}</Table.Th>
              <Table.Th>{t('col_left')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {EMPLOYEES.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td fw={500}>{e.name}</Table.Td>
                <Table.Td>{e.login}</Table.Td>
                <Table.Td>{e.notifyEmail ?? <Text span c="dimmed">{t('no_email')}</Text>}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={e.role === 'admin' ? 'blue' : 'gray'}>{t(`role.${e.role}`)}</Badge>
                </Table.Td>
                <Table.Td>{t('pool', { annual: e.annual, carried: e.carried })}</Table.Td>
                <Table.Td fw={600}>{e.annual + e.carried - e.used}</Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    <Button size="xs" variant="subtle">{t('edit')}</Button>
                    <Button size="xs" variant="subtle">{t('set_password')}</Button>
                    <Button size="xs" variant="subtle" color="red">{t('archive')}</Button>
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
          <TextInput label={t('col_login')} description={t('login_hint')} placeholder="jan.kowalski@firma.pl" />
          <TextInput label={t('col_notify')} description={t('notify_hint')} />
          <Select label={t('col_role')} data={[{ value: 'employee', label: t('role.employee') }, { value: 'admin', label: t('role.admin') }]} defaultValue="employee" />
          <PasswordInput label={t('password')} description={t('password_hint')} />
          <Group grow>
            <NumberInput label={t('annual')} defaultValue={26} min={0} />
            <NumberInput label={t('carried')} defaultValue={0} min={0} />
          </Group>
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>{t('cancel')}</Button>
            <Button onClick={close}>{t('save')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
