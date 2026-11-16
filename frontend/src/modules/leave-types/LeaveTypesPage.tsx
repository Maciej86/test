import { useState } from 'react';
import { Button, Group, Stack, Switch, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { LeaveTypeItem } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { apiErrorMessage } from '../../core/api/client';
import { notify } from '../../core/notify';
import { HideLeaveTypeModal } from './components/HideLeaveTypeModal';
import { LeaveTypeFormModal } from './components/LeaveTypeFormModal';
import { LeaveTypeCards, LeaveTypesTable, type RowActions } from './components/LeaveTypesTable';
import { useLeaveTypes, useMoveLeaveType, useUnhideLeaveType } from './leave-types.api';

type Dialog = { kind: 'form'; leaveType: LeaveTypeItem | null } | { kind: 'hide'; leaveType: LeaveTypeItem };

/** Ekran „Typy urlopów” (administrator): kolejność, dodawanie, edycja, ukrywanie i przywracanie. */
export const LeaveTypesPage = () => {
  const { t } = useTranslation('leave-types');
  const leaveTypes = useLeaveTypes();
  const move = useMoveLeaveType();
  const unhide = useUnhideLeaveType();
  const [showHidden, setShowHidden] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const items = leaveTypes.data?.items ?? [];
  const visible = items.filter((lt) => !lt.hidden);
  const hidden = items.filter((lt) => lt.hidden);
  const rows = showHidden ? [...visible, ...hidden] : visible;
  const onError = (error: unknown) => notify.error(apiErrorMessage(error, t));
  const actions: RowActions = {
    onEdit: (leaveType) => setDialog({ kind: 'form', leaveType }),
    onHide: (leaveType) => setDialog({ kind: 'hide', leaveType }),
    onUnhide: (leaveType) => unhide.mutate(leaveType.id, { onSuccess: () => notify.success(t('unhidden_done')), onError }),
    onMove: (leaveType, direction) => move.mutate({ id: leaveType.id, direction }, { onError }),
  };
  const add = () => setDialog({ kind: 'form', leaveType: null });
  const addButton = <Button leftSection={<ButtonIcon action="add" />} onClick={add}>{t('add')}</Button>;

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Title order={1}>{t('title')}</Title>
          {leaveTypes.data && <Text c="dimmed" size="sm">{t('summary', { visible: visible.length, hidden: hidden.length })}</Text>}
        </Stack>
        <Group gap="md">
          {hidden.length > 0 && (
            <Switch
              label={t('show_hidden', { count: hidden.length })}
              checked={showHidden}
              onChange={(e) => setShowHidden(e.currentTarget.checked)}
            />
          )}
          {addButton}
        </Group>
      </Group>

      <DataState query={leaveTypes} isEmpty={items.length === 0} emptyText={t('empty')} emptyAction={addButton}>
        <LeaveTypesTable rows={rows} visibleCount={visible.length} {...actions} />
        <LeaveTypeCards rows={rows} visibleCount={visible.length} {...actions} />
      </DataState>

      {dialog?.kind === 'form' && <LeaveTypeFormModal key={dialog.leaveType?.id ?? 'new'} leaveType={dialog.leaveType} onClose={close} />}
      {dialog?.kind === 'hide' && <HideLeaveTypeModal leaveType={dialog.leaveType} onClose={close} />}
    </Stack>
  );
};
