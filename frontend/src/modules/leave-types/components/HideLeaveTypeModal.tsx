import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { LeaveTypeItem } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useHideLeaveType } from '../leave-types.api';

/** Okno „Ukryć typ?”: typ znika z formularza nowego wniosku, złożone wnioski zostają. */
export const HideLeaveTypeModal = ({ leaveType, onClose }: { leaveType: LeaveTypeItem; onClose: () => void }) => {
  const { t } = useTranslation('leave-types');
  const hide = useHideLeaveType();
  const confirm = () =>
    hide.mutate(leaveType.id, {
      onSuccess: () => { notify.success(t('hidden_done')); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  return (
    <ConfirmModal
      title={t('hide_title', { name: leaveType.name })}
      confirmLabel={t('hide')}
      confirmAction="hide"
      loading={hide.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>{t('hide_text', { count: leaveType.requestsCount })}</Text>
    </ConfirmModal>
  );
};
