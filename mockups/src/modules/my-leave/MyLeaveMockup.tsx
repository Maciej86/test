import { Badge, Button, Group, Modal, Select, SimpleGrid, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { InfoCard } from '../../common/InfoCard';
import { LEAVE_TYPES, MY_REQUESTS, POOL, type LeaveStatus } from './data';

export const STATUS_COLOR: Record<LeaveStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'gray',
};

export function MyLeaveMockup() {
  const { t } = useTranslation('my-leave');
  const [opened, { open, close }] = useDisclosure(false);
  const left = POOL.annual + POOL.carriedOver - POOL.usedAnnual - POOL.usedCarried;

  return (
    <Stack>

      <Group justify="space-between">
        <Title order={2}>{t('title')}</Title>
        <Button onClick={open}>{t('new_request')}</Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <InfoCard title={t('left')}>
          <Text fz={32} fw={700}>{left}</Text>
        </InfoCard>
        <InfoCard title={t('carried', { year: POOL.year - 1 })}>
          <Text fz={32} fw={700}>{POOL.carriedOver - POOL.usedCarried}</Text>
          <Text size="sm" c="dimmed">{t('carried_hint', { count: POOL.carriedOver })}</Text>
        </InfoCard>
        <InfoCard title={t('annual', { year: POOL.year })}>
          <Text fz={32} fw={700}>{POOL.annual - POOL.usedAnnual}</Text>
          <Text size="sm" c="dimmed">{t('annual_hint', { count: POOL.annual })}</Text>
        </InfoCard>
      </SimpleGrid>

      <Title order={3}>{t('history')}</Title>
      <Table.ScrollContainer minWidth={640}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_type')}</Table.Th>
              <Table.Th>{t('col_dates')}</Table.Th>
              <Table.Th>{t('col_days')}</Table.Th>
              <Table.Th>{t('col_status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {MY_REQUESTS.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>{r.type}</Table.Td>
                <Table.Td>
                  <DateText value={r.from} /> – <DateText value={r.to} />
                </Table.Td>
                <Table.Td>{r.days}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
                  {r.note && <Text size="xs" c="dimmed" mt={4}>{r.note}</Text>}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    {r.status === 'pending' && <Button size="xs" variant="default">{t('withdraw')}</Button>}
                    {r.status === 'approved' && <Button size="xs" variant="subtle">{t('print')}</Button>}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Modal opened={opened} onClose={close} title={t('new_request')}>
        <Stack>
          <Select label={t('col_type')} data={LEAVE_TYPES} defaultValue="Wypoczynkowy" />
          <Group grow>
            <TextInput label={t('from')} placeholder="DD.MM.RRRR" />
            <TextInput label={t('to')} placeholder="DD.MM.RRRR" />
          </Group>
          <Text size="sm" c="dimmed">{t('days_preview')}</Text>
          <Textarea label={t('comment')} autosize minRows={2} />
          <Group justify="flex-end">
            <Button variant="default" onClick={close}>{t('cancel')}</Button>
            <Button onClick={close}>{t('submit')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
