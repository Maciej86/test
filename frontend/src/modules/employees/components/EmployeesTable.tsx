import { Card, Group, Stack, Table, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH, type EmployeeListItem } from '@app/shared';
import { PoolMeter } from './PoolMeter';
import { NameCell, RoleBadge, RowButtons, type RowActions } from './EmployeeRowParts';

/** Szersza niż zwykła tabela: pasek puli i trzy przyciski w wierszu. */
const EMPLOYEES_TABLE_MIN_WIDTH = TABLE_MIN_WIDTH + 260;

/** Komputer: tabela. */
export function EmployeesTable({ rows, year, ...actions }: RowActions & { rows: EmployeeListItem[]; year: number }) {
  const { t } = useTranslation('employees');
  return (
    <Table.ScrollContainer minWidth={EMPLOYEES_TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_role')}</Table.Th>
            <Table.Th>{t('col_pool', { year })}</Table.Th>
            <Table.Th>{t('col_notify')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((e) => (
            <Table.Tr key={e.id}>
              <Table.Td><NameCell e={e} /></Table.Td>
              <Table.Td><RoleBadge role={e.role} /></Table.Td>
              <Table.Td><PoolMeter pool={e.pool} role={e.role} /></Table.Td>
              <Table.Td>{e.email ?? <Text span inherit c="dimmed">{t('no_email')}</Text>}</Table.Td>
              <Table.Td><RowButtons e={e} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Telefon: każda osoba to karta zamiast wiersza tabeli. */
export function EmployeeCards({ rows, ...actions }: RowActions & { rows: EmployeeListItem[] }) {
  const { t } = useTranslation('employees');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((e) => (
        <Card key={e.id} withBorder padding="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell e={e} />
              <RoleBadge role={e.role} />
            </Group>
            <PoolMeter pool={e.pool} role={e.role} />
            <Text size="sm" c="dimmed">{t('col_notify')}: {e.email ?? t('no_email')}</Text>
            <RowButtons e={e} {...actions} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
