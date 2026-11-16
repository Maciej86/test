import { useState } from 'react';
import { Button, Group, Stack, Switch, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ContractTypeItem } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DataState } from '../../common/DataState';
import { apiErrorMessage } from '../../core/api/client';
import { notify } from '../../core/notify';
import { ContractTypeCards, ContractTypesTable, type RowActions } from './components/ContractTypesTable';
import { ContractTypeFormModal } from './components/ContractTypeFormModal';
import { HideContractTypeModal } from './components/HideContractTypeModal';
import { useContractTypes, useMoveContractType, useUnhideContractType } from './contract-types.api';

type Dialog = { kind: 'form'; contractType: ContractTypeItem | null } | { kind: 'hide'; contractType: ContractTypeItem };

/** Ekran „Typy umów” (administrator): kolejność, dodawanie, zmiana nazwy, ukrywanie i przywracanie. */
export const ContractTypesPage = () => {
  const { t } = useTranslation('contract-types');
  const contractTypes = useContractTypes();
  const move = useMoveContractType();
  const unhide = useUnhideContractType();
  const [showHidden, setShowHidden] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const close = () => setDialog(null);

  const items = contractTypes.data?.items ?? [];
  const visible = items.filter((ct) => !ct.hidden);
  const hidden = items.filter((ct) => ct.hidden);
  // Gdy wszystkie typy są ukryte, pusta tabela nic by nie dała: pokazujemy ukryte od razu, żeby dało się je przywrócić.
  const allHidden = visible.length === 0 && hidden.length > 0;
  const rows = showHidden || allHidden ? [...visible, ...hidden] : visible;
  const onError = (error: unknown) => notify.error(apiErrorMessage(error, t));
  const actions: RowActions = {
    onEdit: (contractType) => setDialog({ kind: 'form', contractType }),
    onHide: (contractType) => setDialog({ kind: 'hide', contractType }),
    onUnhide: (contractType) => unhide.mutate(contractType.id, { onSuccess: () => notify.success(t('unhidden_done')), onError }),
    onMove: (contractType, direction) => move.mutate({ id: contractType.id, direction }, { onError }),
    unhidingId: unhide.isPending ? (unhide.variables ?? null) : null,
  };
  const add = () => setDialog({ kind: 'form', contractType: null });
  const addButton = <Button leftSection={<ButtonIcon action="add" />} onClick={add}>{t('add')}</Button>;

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Title order={1}>{t('title')}</Title>
          {contractTypes.data && <Text c="dimmed" size="sm">{t('summary', { visible: visible.length, hidden: hidden.length })}</Text>}
        </Stack>
        <Group gap="md">
          {hidden.length > 0 && (
            <Switch
              label={t('show_hidden', { count: hidden.length })}
              checked={showHidden || allHidden}
              disabled={allHidden}
              onChange={(e) => setShowHidden(e.currentTarget.checked)}
            />
          )}
          {addButton}
        </Group>
      </Group>

      <DataState query={contractTypes} isEmpty={items.length === 0} emptyText={t('empty')} emptyAction={addButton}>
        <ContractTypesTable rows={rows} visibleCount={visible.length} {...actions} />
        <ContractTypeCards rows={rows} visibleCount={visible.length} {...actions} />
      </DataState>

      {dialog?.kind === 'form' && (
        <ContractTypeFormModal key={dialog.contractType?.id ?? 'new'} contractType={dialog.contractType} onClose={close} />
      )}
      {dialog?.kind === 'hide' && <HideContractTypeModal contractType={dialog.contractType} onClose={close} />}
    </Stack>
  );
};
