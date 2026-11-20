import { useState } from 'react';
import { Badge, Button, Card, Group, Stack, Table, Text, Tooltip } from '@mantine/core';
import { Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, TABLE_MIN_WIDTH, translateKey, type ArchivedEmployee } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { ListPagination } from '../../../common/ListPagination';
import { SearchField } from '../../../common/SearchField';
import { useArchivedEmployees } from '../archive.api';
import { ArchiveEmpty, ArchivedCell } from './ArchiveParts';
import { DeleteEmployeeModal, RestoreEmployeeModal } from './EmployeeModals';

interface Actions {
  onRestore: (e: ArchivedEmployee) => void;
  onDelete: (e: ArchivedEmployee) => void;
}

const Buttons = ({ e, onRestore, onDelete }: Actions & { e: ArchivedEmployee }) => {
  const { t } = useTranslation('archive');
  // Konto z wnioskami urlopowymi zostaje w archiwum na zawsze (odpowiedź 1a); serwer też odmawia.
  const blocked = e.leaveRequests > 0;
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="restore" size={14} />} onClick={() => onRestore(e)}>{t('restore')}</Button>
      <Tooltip label={t('cannot_delete_with_leave')} disabled={!blocked} multiline w={260}>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="delete" size={14} />} disabled={blocked} onClick={() => onDelete(e)}>
          {t('delete_forever')}
        </Button>
      </Tooltip>
    </Group>
  );
};

const Name = ({ e }: { e: ArchivedEmployee }) => (
  <Stack gap={0}>
    <Text fw={600}>{e.name}</Text>
    <Text size="sm" c="dimmed">{e.login}</Text>
  </Stack>
);

const History = ({ e }: { e: ArchivedEmployee }) => {
  const { t } = useTranslation('archive');
  return (
    <Stack gap={0}>
      <Text size="sm" c={e.leaveRequests === 0 ? 'dimmed' : undefined}>{t('leave_requests', { count: e.leaveRequests })}</Text>
      {e.tasks > 0 && <Text size="sm" c="dimmed">{t('tasks', { count: e.tasks })}</Text>}
    </Stack>
  );
};

const Role = ({ e }: { e: ArchivedEmployee }) => {
  const { t } = useTranslation('archive');
  return <Badge variant="light" color={e.role === 'admin' ? 'navy' : 'gray'}>{translateKey(t, ROLE_LABELS[e.role])}</Badge>;
};

const EmployeesList = ({ rows, ...actions }: Actions & { rows: ArchivedEmployee[] }) => {
  const { t } = useTranslation('archive');
  return (
    <>
      <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 100} visibleFrom="sm">
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{t('col_name')}</Table.Th>
              <Table.Th>{t('col_role')}</Table.Th>
              <Table.Th>{t('col_history')}</Table.Th>
              <Table.Th>{t('col_archived')}</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((e) => (
              <Table.Tr key={e.id}>
                <Table.Td><Name e={e} /></Table.Td>
                <Table.Td><Role e={e} /></Table.Td>
                <Table.Td><History e={e} /></Table.Td>
                <Table.Td><ArchivedCell at={e.archivedAt} by={e.archivedByName} /></Table.Td>
                <Table.Td><Buttons e={e} {...actions} /></Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      <Stack gap="sm" hiddenFrom="sm">
        {rows.map((e) => (
          <Card key={e.id} withBorder padding="md">
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <Name e={e} />
                <Role e={e} />
              </Group>
              <Group justify="space-between" align="flex-start">
                <History e={e} />
                <ArchivedCell at={e.archivedAt} by={e.archivedByName} />
              </Group>
              <Buttons e={e} {...actions} />
            </Stack>
          </Card>
        ))}
      </Stack>
    </>
  );
};

type Dialog = { kind: 'restore' | 'delete'; employee: ArchivedEmployee };

/** Zakładka „Pracownicy”: wyszukiwarka, lista kont w archiwum, przywracanie i usuwanie na stałe. */
export const ArchivedEmployees = ({ page, search, onChange }: { page: number; search: string; onChange: (next: { page?: number; search?: string }) => void }) => {
  const { t } = useTranslation('archive');
  const list = useArchivedEmployees({ page, search });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);
  const data = list.data;
  return (
    <Stack>
      <SearchField label={t('search_employees')} value={search} onChange={(s) => onChange({ search: s })} w={{ base: '100%', sm: 420 }} />
      <DataState query={list}>
        {data && data.items.length === 0 && (search ? <ArchiveEmpty text={t('no_results')} /> : <ArchiveEmpty icon={Users} title={t('empty_employees_title')} text={t('empty_employees_text')} />)}
        {data && data.items.length > 0 && (
          <>
            <EmployeesList rows={data.items} onRestore={(employee) => setDialog({ kind: 'restore', employee })} onDelete={(employee) => setDialog({ kind: 'delete', employee })} />
            <ListPagination data={data} page={page} onChange={(p) => onChange({ page: p })} />
          </>
        )}
      </DataState>
      {dialog?.kind === 'restore' && <RestoreEmployeeModal employee={dialog.employee} onClose={close} />}
      {dialog?.kind === 'delete' && <DeleteEmployeeModal employee={dialog.employee} onClose={close} />}
    </Stack>
  );
};
