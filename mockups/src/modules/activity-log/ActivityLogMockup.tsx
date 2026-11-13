import { Badge, Group, Select, Stack, Table, TextInput, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DateText } from '../../common/DateText';
import { ENTRIES } from './data';

const AREA_COLOR: Record<string, string> = { leave: 'blue', pool: 'violet', tasks: 'teal' };

export function ActivityLogMockup() {
  const { t } = useTranslation('activity-log');
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <Group>
        <Select
          placeholder={t('filter_area')}
          data={[
            { value: 'leave', label: t('area.leave') },
            { value: 'pool', label: t('area.pool') },
            { value: 'tasks', label: t('area.tasks') },
          ]}
          clearable
          w={200}
        />
        <TextInput placeholder={t('search')} w={240} />
      </Group>
      <Table.ScrollContainer minWidth={720}>
        <Table striped>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_when')}</Table.Th>
              <Table.Th>{t('col_who')}</Table.Th>
              <Table.Th>{t('col_area')}</Table.Th>
              <Table.Th>{t('col_what')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ENTRIES.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td style={{ whiteSpace: 'nowrap' }}><DateText value={e.at} withTime /></Table.Td>
                <Table.Td>{e.who}</Table.Td>
                <Table.Td><Badge variant="light" color={AREA_COLOR[e.area]}>{t(`area.${e.area}`)}</Badge></Table.Td>
                <Table.Td>{e.text}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
