import { Badge, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, translateKey, type EmployeeListItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';

/** Co można zrobić z osobą na liście (otwiera okna na ekranie listy). */
export interface RowActions {
  onEdit: (e: EmployeeListItem) => void;
  onPassword: (e: EmployeeListItem) => void;
  onArchive: (e: EmployeeListItem) => void;
}

export const RoleBadge = ({ role }: { role: EmployeeListItem['role'] }) => {
  const { t } = useTranslation();
  return <Badge variant="light" color={role === 'admin' ? 'navy' : 'gray'}>{translateKey(t, ROLE_LABELS[role])}</Badge>;
};

export const NameCell = ({ e }: { e: EmployeeListItem }) => {
  const { t } = useTranslation('employees');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600}>{e.name}</Text>
        {e.isMe && <Text span size="xs" c="dimmed">({t('me')})</Text>}
      </Group>
      <Text size="sm" c="dimmed">{e.login}</Text>
    </Stack>
  );
};

export const RowButtons = ({ e, onEdit, onPassword, onArchive }: RowActions & { e: EmployeeListItem }) => {
  const { t } = useTranslation('employees');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(e)}>
        {t('edit')}
      </Button>
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="password" size={14} />} onClick={() => onPassword(e)}>
        {t('set_password')}
      </Button>
      <Tooltip label={t('archive_self')} disabled={!e.isMe}>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<ButtonIcon action="archive" size={14} />}
          disabled={e.isMe}
          onClick={() => onArchive(e)}
        >
          {t('archive')}
        </Button>
      </Tooltip>
    </Group>
  );
};
