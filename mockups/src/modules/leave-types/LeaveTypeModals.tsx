import { Alert, Anchor, Button, Group, Modal, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { notify } from '../../common/notify';
import { TAKEN_NAME, type MockLeaveType } from './data';

/** Dodawanie (leaveType = null) i edycja typu. `nameTaken` pokazuje błąd nazwy zajętej przez ukryty typ. */
export function LeaveTypeModal({ leaveType, nameTaken = false, onClose }: {
  leaveType: MockLeaveType | null;
  nameTaken?: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('leave-types');
  const isNew = leaveType === null;

  const save = () => {
    notify.success(isNew ? t('added') : t('saved'));
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title={isNew ? t('add') : t('edit_title', { name: leaveType.name })}>
      <Stack>
        {!isNew && leaveType.requests > 0 && (
          <Alert color="yellow" icon={<CircleAlert size={18} />}>
            {t('used_warning', { count: leaveType.requests })}
          </Alert>
        )}
        <TextInput
          label={t('field_name')}
          withAsterisk
          description={t('field_name_hint')}
          defaultValue={leaveType?.name ?? (nameTaken ? TAKEN_NAME : '')}
          error={nameTaken && (
            <>
              {t('name_taken_hidden', { name: 'Szkoleniowy' })}{' '}
              <Anchor size="xs" component="button" type="button" c="red.3" td="underline">{t('name_taken_restore')}</Anchor>
            </>
          )}
        />
        <Switch
          label={t('field_deducts')}
          description={t('field_deducts_hint')}
          defaultChecked={leaveType?.deducts ?? true}
        />
        <NumberInput
          label={t('field_limit')}
          description={t('field_limit_hint')}
          defaultValue={leaveType?.limit ?? ''}
          min={1}
          max={365}
          allowDecimal={false}
          suffix={t('field_limit_suffix')}
          w={{ base: '100%', xs: 220 }}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="save" />} onClick={save}>{t('save')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export function HideModal({ leaveType, onClose }: { leaveType: MockLeaveType | null; onClose: () => void }) {
  const { t } = useTranslation('leave-types');
  return (
    <Modal opened={leaveType !== null} onClose={onClose} title={t('hide_title', { name: leaveType?.name })}>
      <Stack>
        <Text>{t('hide_text', { count: leaveType?.requests ?? 0 })}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="hide" />} onClick={() => { notify.success(t('hidden_done')); onClose(); }}>
            {t('hide')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
