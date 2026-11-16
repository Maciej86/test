import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { LeaveTypeItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
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
      onError: (error) => { notify.error(apiErrorMessage(error, t)); onClose(); },
    });
  return (
    <Modal opened onClose={onClose} title={t('hide_title', { name: leaveType.name })}>
      <Stack>
        <Text>{t('hide_text', { count: leaveType.requestsCount })}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="hide" />} loading={hide.isPending} onClick={confirm}>{t('hide')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};
