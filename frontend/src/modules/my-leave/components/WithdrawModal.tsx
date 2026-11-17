import { Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { MyLeaveRequest } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useWithdrawRequest } from '../my-leave.api';
import { Dates } from './RequestsTable';

/** „Wycofać wniosek?”: termin i liczba dni; zdanie o puli tylko przy typie, który odejmuje dni. Błąd zostawia okno. */
export const WithdrawModal = ({ request, onClose }: { request: MyLeaveRequest; onClose: () => void }) => {
  const { t } = useTranslation('my-leave');
  const withdraw = useWithdrawRequest();
  const reserved = request.daysFromCarried + request.daysFromAnnual;

  const confirm = () => {
    withdraw.mutate(request.id, {
      onSuccess: () => {
        notify.success(reserved > 0 ? t('withdrawn_done') : t('withdrawn_done_no_pool'));
        onClose();
      },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  };

  return (
    <ConfirmModal
      title={t('withdraw_title')}
      confirmLabel={t('withdraw')}
      confirmAction="cancel"
      cancelLabel={t('keep')}
      danger
      loading={withdraw.isPending}
      onConfirm={confirm}
      onClose={onClose}
    >
      <Text>
        {request.leaveTypeName}, <Dates from={request.dateFrom} to={request.dateTo} /> ({t('days', { count: request.workingDays })}).
      </Text>
      <Text size="sm" c="dimmed">{reserved > 0 ? t('withdraw_text', { count: reserved }) : t('withdraw_text_no_pool')}</Text>
    </ConfirmModal>
  );
};
