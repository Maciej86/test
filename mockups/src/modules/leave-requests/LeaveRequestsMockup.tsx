import { useState } from 'react';
import { Badge, Button, Group, Modal, SegmentedControl, Stack, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { REQUESTS, type LeaveStatus } from './data';

const STATUS_COLOR: Record<LeaveStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'gray',
};

export function LeaveRequestsMockup() {
  const { t } = useTranslation('leave-requests');
  const [filter, setFilter] = useState('pending');
  const [rejectOpened, reject] = useDisclosure(false);
  const rows = REQUESTS.filter((r) => filter === 'all' || r.status === filter);

  return (
    <Stack>

      <Title order={2}>{t('title')}</Title>
      <Group justify="space-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          data={[
            { value: 'pending', label: t('filter_pending', { count: REQUESTS.filter((r) => r.status === 'pending').length }) },
            { value: 'approved', label: t('status.approved') },
            { value: 'rejected', label: t('status.rejected') },
            { value: 'all', label: t('filter_all') },
          ]}
        />
        <TextInput placeholder={t('search')} w={260} />
      </Group>

      <Table.ScrollContainer minWidth={820}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_employee')}</Table.Th>
              <Table.Th>{t('col_type')}</Table.Th>
              <Table.Th>{t('col_dates')}</Table.Th>
              <Table.Th>{t('col_days')}</Table.Th>
              <Table.Th>{t('col_left')}</Table.Th>
              <Table.Th>{t('col_status')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((r) => (
              <Table.Tr key={r.id}>
                <Table.Td>
                  <Text fw={500}>{r.employee}</Text>
                  {r.comment && <Text size="xs" c="dimmed">{r.comment}</Text>}
                </Table.Td>
                <Table.Td>{r.type}</Table.Td>
                <Table.Td>
                  <DateText value={r.from} /> – <DateText value={r.to} />
                </Table.Td>
                <Table.Td>{r.days}</Table.Td>
                <Table.Td>{r.left}</Table.Td>
                <Table.Td>
                  <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" justify="flex-end" wrap="nowrap">
                    {r.status === 'pending' && (
                      <>
                        <Button size="xs" color="green">{t('approve')}</Button>
                        <Button size="xs" variant="default" onClick={reject.open}>{t('reject')}</Button>
                      </>
                    )}
                    {r.status === 'approved' && (
                      <>
                        <Button size="xs" variant="subtle">{t('print')}</Button>
                        <Button size="xs" variant="subtle" color="red">{t('cancel_leave')}</Button>
                      </>
                    )}
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && <Text c="dimmed">{t('empty')}</Text>}

      <Modal opened={rejectOpened} onClose={reject.close} title={t('reject_title')}>
        <Stack>
          <Text size="sm">{t('reject_text')}</Text>
          <Textarea label={t('reject_reason')} autosize minRows={3} />
          <Group justify="flex-end">
            <Button variant="default" onClick={reject.close}>{t('back')}</Button>
            <Button color="red" onClick={reject.close}>{t('reject')}</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
