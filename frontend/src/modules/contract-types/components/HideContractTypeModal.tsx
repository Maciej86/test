import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ContractTypeItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useHideContractType } from '../contract-types.api';

/** Okno „Ukryć typ?”: typ znika z okna pracownika, pracownicy z tym typem go zachowują. */
export const HideContractTypeModal = ({ contractType, onClose }: { contractType: ContractTypeItem; onClose: () => void }) => {
  const { t } = useTranslation('contract-types');
  const hide = useHideContractType();
  const confirm = () =>
    hide.mutate(contractType.id, {
      onSuccess: () => { notify.success(t('hidden_done')); onClose(); },
      onError: (error) => { notify.error(apiErrorMessage(error, t)); onClose(); },
    });
  return (
    <Modal opened onClose={onClose} title={t('hide_title', { name: contractType.name })}>
      <Stack>
        <Text>{t('hide_text', { count: contractType.employeesCount })}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="hide" />} loading={hide.isPending} onClick={confirm}>{t('hide')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
