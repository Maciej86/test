import { useState } from 'react';
import { Alert, Anchor, Button, ColorSwatch, Group, Modal, NumberInput, Radio, Stack, Switch, Text, TextInput } from '@mantine/core';
import { Check, CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { notify } from '../../common/notify';
import { TAKEN_NAME, TYPE_COLORS, type MockLeaveType } from './data';

/** Dodawanie (leaveType = null) i edycja typu. `nameTaken` pokazuje błąd nazwy zajętej przez ukryty typ. */
export const LeaveTypeModal = ({ leaveType, nameTaken = false, onClose }: {
  leaveType: MockLeaveType | null;
  nameTaken?: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation('leave-types');
  const isNew = leaveType === null;
  const [color, setColor] = useState(leaveType?.color ?? 'green');

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
        <Radio.Group label={t('field_day_count')} defaultValue={leaveType?.dayCount ?? 'working'}>
          <Stack gap="xs" mt={6}>
            <Radio value="working" label={t('day_count.working')} description={t('day_count_hint.working')} />
            <Radio value="calendar" label={t('day_count.calendar')} description={t('day_count_hint.calendar')} />
          </Stack>
        </Radio.Group>
        <Switch
          label={t('field_approval')}
          description={t('field_approval_hint')}
          defaultChecked={leaveType?.approval ?? true}
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
        <Stack gap={6}>
          <Text size="sm" fw={500}>{t('field_color')}</Text>
          <Group gap="xs">
            {TYPE_COLORS.map((c) => (
              <ColorSwatch
                key={c}
                component="button"
                type="button"
                color={`var(--mantine-color-${c}-8)`}
                radius={3}
                size={30}
                aria-label={t(`colors.${c}`)}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                style={{ cursor: 'pointer', outline: color === c ? '2px solid var(--mantine-color-dark-0)' : undefined, outlineOffset: 2 }}
              >
                {color === c && <Check size={16} />}
              </ColorSwatch>
            ))}
          </Group>
          <Text size="xs" c="dimmed">{t('field_color_hint')}</Text>
        </Stack>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="save" />} onClick={save}>{t('save')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const HideModal = ({ leaveType, onClose }: { leaveType: MockLeaveType | null; onClose: () => void }) => {
  const { t } = useTranslation('leave-types');
  if (!leaveType) return null;
  return (
    <ConfirmModal
      title={t('hide_title', { name: leaveType.name })}
      confirmLabel={t('hide')}
      confirmAction="hide"
      onConfirm={() => { notify.success(t('hidden_done')); onClose(); }}
      onClose={onClose}
    >
      <Text>{t('hide_text', { count: leaveType.requests })}</Text>
    </ConfirmModal>
  );
};
