import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { ContractTypeItem } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
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
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  return (
    <ConfirmModal
      title={t('hide_title', { name: contractType.name })}
      confirmLabel={t('hide')}
      confirmAction="hide"
      loading={hide.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>{t('hide_text', { count: contractType.employeesCount })}</Text>
    </ConfirmModal>
  );
};
