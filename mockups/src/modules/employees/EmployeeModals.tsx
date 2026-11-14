import { useState } from 'react';
import {
  Alert,
  Anchor,
  Button,
  Divider,
  Group,
  List,
  Modal,
  NumberInput,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { notify } from '../../common/notify';
import { ARCHIVED_DUPLICATE, EMPLOYEES, GENERATED_PASSWORD, POOL_YEAR, poolParts, type MockEmployee } from './data';

function PasswordField({ label }: { label: string }) {
  const { t } = useTranslation('employees');
  const [value, setValue] = useState('');
  return (
    <Group align="flex-end" gap="xs" wrap="nowrap">
      <PasswordInput
        label={label}
        description={t('password_hint')}
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        visible={value === GENERATED_PASSWORD}
        style={{ flex: 1 }}
      />
      <Button variant="default" leftSection={<ButtonIcon action="refresh" />} onClick={() => setValue(GENERATED_PASSWORD)}>
        {t('generate')}
      </Button>
    </Group>
  );
}

/** Dodawanie (employee = null) i edycja pracownika. `loginTaken` pokazuje błąd loginu z kontem w archiwum. */
export function EmployeeModal({ opened, onClose, employee, loginTaken = false }: {
  opened: boolean;
  onClose: () => void;
  employee: MockEmployee | null;
  loginTaken?: boolean;
}) {
  const { t } = useTranslation('employees');
  const [role, setRole] = useState<string>(employee?.role ?? 'employee');
  const isNew = employee === null;

  const save = () => {
    notify.success(isNew ? t('added') : t('saved'));
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isNew ? t('add') : t('edit_title', { name: employee.name })} size="lg">
      <Stack>
        <TextInput label={t('name')} withAsterisk defaultValue={employee?.name ?? (loginTaken ? 'Ewa Mazur' : '')} />
        <TextInput
          label={t('login')}
          withAsterisk
          description={t('login_hint')}
          placeholder="jan.kowalski@firma.pl"
          defaultValue={employee?.login ?? (loginTaken ? ARCHIVED_DUPLICATE.login : '')}
          error={loginTaken && (
            <>
              {t('login_taken_archived', { name: ARCHIVED_DUPLICATE.name })}{' '}
              <Anchor size="xs" component="button" type="button" c="red.3" td="underline">{t('login_restore')}</Anchor>
            </>
          )}
        />
        <TextInput label={t('notify_email')} description={t('notify_hint')} defaultValue={employee?.notifyEmail ?? ''} />
        <Select
          label={t('col_role')}
          withAsterisk
          data={[{ value: 'employee', label: t('role.employee') }, { value: 'admin', label: t('role.admin') }]}
          value={role}
          onChange={(v) => setRole(v ?? 'employee')}
          allowDeselect={false}
          disabled={employee?.isMe}
          description={employee?.isMe ? t('role_self') : undefined}
        />
        {isNew && <PasswordField label={t('password')} />}

        {role === 'employee' && (
          <>
            <Divider label={t('pool_section', { year: POOL_YEAR })} labelPosition="left" mt="xs" />
            <Text size="xs" c="dimmed" mt={-8}>{t('pool_section_hint')}</Text>
            <SimpleGrid cols={{ base: 1, xs: 2 }}>
              <NumberInput label={t('annual')} withAsterisk description={t('days_hint')} defaultValue={employee?.pool?.annual ?? 26} min={0} max={60} allowDecimal={false} />
              <NumberInput label={t('carried', { year: POOL_YEAR - 1 })} description={t('days_hint')} defaultValue={employee?.pool?.carried ?? 0} min={0} max={60} allowDecimal={false} />
            </SimpleGrid>
          </>
        )}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="save" />} onClick={save}>{t('save')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function PasswordModal({ employee, onClose }: { employee: MockEmployee | null; onClose: () => void }) {
  const { t } = useTranslation('employees');
  return (
    <Modal opened={employee !== null} onClose={onClose} title={t('password_title', { name: employee?.name })}>
      <Stack>
        <Text size="sm">{t('password_intro', { name: employee?.name })}</Text>
        <PasswordField label={t('password')} />
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="password" />} onClick={() => { notify.success(t('password_saved')); onClose(); }}>
            {t('password_save')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function ArchiveModal({ employee, onClose }: { employee: MockEmployee | null; onClose: () => void }) {
  const { t } = useTranslation('employees');
  return (
    <Modal opened={employee !== null} onClose={onClose} title={t('archive_title', { name: employee?.name })}>
      <Stack>
        <List size="sm" spacing={6}>
          <List.Item>{t('archive_logout')}</List.Item>
          <List.Item>{t('archive_keeps')}</List.Item>
          {employee && employee.pendingRequests > 0 && <List.Item>{t('archive_pending', { count: employee.pendingRequests })}</List.Item>}
          {employee && employee.tasks > 0 && <List.Item>{t('archive_tasks', { count: employee.tasks })}</List.Item>}
        </List>
        <Text size="sm" c="dimmed">{t('archive_restore_hint')}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button color="red" leftSection={<ButtonIcon action="archive" />} onClick={() => { notify.success(t('archived')); onClose(); }}>
            {t('archive')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function CloseYearModal({ opened, onClose }: { opened: boolean; onClose: () => void }) {
  const { t } = useTranslation('employees');
  const next = POOL_YEAR + 1;
  const staff = EMPLOYEES.filter((e) => e.pool !== null);
  const pending = staff.reduce((sum, e) => sum + e.pendingRequests, 0);
  const [annuals, setAnnuals] = useState<Record<number, number>>({});

  return (
    <Modal opened={opened} onClose={onClose} title={t('close_year', { year: POOL_YEAR })} size="xl">
      <Stack>
        <Text size="sm">{t('close_year_intro', { year: POOL_YEAR, next })}</Text>
        {pending > 0 && (
          <Alert color="yellow" icon={<CircleAlert size={18} />}>{t('close_year_pending', { count: pending, next })}</Alert>
        )}
        <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
          <Table verticalSpacing="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('col_name')}</Table.Th>
                <Table.Th ta="right">{t('close_col_left', { year: POOL_YEAR })}</Table.Th>
                <Table.Th w={150}>{t('close_col_annual', { year: next })}</Table.Th>
                <Table.Th ta="right">{t('close_col_total', { year: next })}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {staff.map((e) => {
                const { left } = poolParts(e.pool!);
                const annual = annuals[e.id] ?? e.pool!.annual;
                return (
                  <Table.Tr key={e.id}>
                    <Table.Td fw={500}>{e.name}</Table.Td>
                    <Table.Td ta="right">{left}</Table.Td>
                    <Table.Td>
                      <NumberInput
                        size="xs"
                        value={annual}
                        onChange={(v) => setAnnuals((a) => ({ ...a, [e.id]: Number(v) || 0 }))}
                        min={0}
                        max={60}
                        allowDecimal={false}
                        aria-label={t('close_col_annual', { year: next })}
                      />
                    </Table.Td>
                    <Table.Td ta="right" fw={700}>{left + annual}</Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="close_year" />} onClick={() => { notify.success(t('close_done', { year: POOL_YEAR, next })); onClose(); }}>
            {t('close_confirm', { year: POOL_YEAR })}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
