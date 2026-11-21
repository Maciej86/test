import { useState, type ReactNode } from 'react';
import { Alert, Anchor, NumberInput, Radio, Stack, Switch, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEAVE_DAY_COUNTS, LEAVE_TYPE_COLORS, LEAVE_TYPE_DEFAULT_COLOR, LEAVE_TYPE_LIMIT_MAX, LEAVE_TYPE_LIMIT_MIN, LEAVE_TYPE_MESSAGES, leaveTypeSchema, type LeaveDayCount, type LeaveTypeColor, type LeaveTypeItem } from '@app/shared';
import { ColorSwatchPicker } from '../../../common/ColorSwatchPicker';
import { FormModal } from '../../../common/FormModal';
import { apiErrorBody, apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useCreateLeaveType, useUnhideLeaveType, useUpdateLeaveType } from '../leave-types.api';

type FormValues = {
  name: string;
  deductsPool: boolean;
  /** Puste pole = bez limitu (schemat zamienia je na null). */
  yearlyLimit: number | '';
  color: LeaveTypeColor;
  dayCount: LeaveDayCount;
  requiresApproval: boolean;
};

interface HiddenType {
  id: number;
  name: string;
}

/** Okno „Dodaj typ urlopu” (leaveType = null) i „Edytuj typ”. */
export const LeaveTypeFormModal = ({ leaveType, onClose }: { leaveType: LeaveTypeItem | null; onClose: () => void }) => {
  const { t } = useTranslation('leave-types');
  const isNew = leaveType === null;
  const create = useCreateLeaveType();
  const update = useUpdateLeaveType();
  const unhide = useUnhideLeaveType();
  const [hiddenType, setHiddenType] = useState<HiddenType | null>(null);
  const form = useForm<FormValues>({
    initialValues: {
      name: leaveType?.name ?? '',
      deductsPool: leaveType?.deductsPool ?? true,
      yearlyLimit: leaveType?.yearlyLimit ?? '',
      color: leaveType?.color ?? LEAVE_TYPE_DEFAULT_COLOR,
      dayCount: leaveType?.dayCount ?? 'working',
      requiresApproval: leaveType?.requiresApproval ?? true,
    },
    validate: zod4Resolver(leaveTypeSchema),
  });

  const submit = form.onSubmit((values) => {
    setHiddenType(null);
    const onError = (error: unknown) => {
      const fields = apiErrorFields(error);
      if (!fields) return notify.error(apiErrorMessage(error, t));
      form.setErrors(fields);
      setHiddenType((apiErrorBody(error)?.hiddenType as HiddenType | undefined) ?? null);
    };
    if (isNew) {
      create.mutate(values, { onSuccess: () => { notify.success(t('added')); onClose(); }, onError });
    } else {
      update.mutate({ id: leaveType.id, ...values }, { onSuccess: () => { notify.success(t('saved')); onClose(); }, onError });
    }
  });

  const restoreHidden = () => {
    if (!hiddenType) return;
    unhide.mutate(hiddenType.id, {
      onSuccess: () => { notify.success(t('unhidden_done')); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  };

  /** Nazwa zajęta przez ukryty typ: tekst z nazwą i link „Przywróć go”. */
  const nameError = (): ReactNode => {
    if (hiddenType && form.errors.name === LEAVE_TYPE_MESSAGES.nameTakenHidden) {
      return (
        <>
          {t('name_taken_hidden', { name: hiddenType.name })}{' '}
          <Anchor component="button" type="button" size="xs" c="red.3" td="underline" onClick={restoreHidden}>
            {t('name_taken_restore')}
          </Anchor>
        </>
      );
    }
    return fieldError(t, form.errors.name);
  };

  return (
    <FormModal title={isNew ? t('add') : t('edit_title', { name: leaveType.name })} submitLabel={t('save')} submitAction="save" loading={create.isPending || update.isPending} onSubmit={submit} onClose={onClose}>
      {!isNew && leaveType.requestsCount > 0 && (
        <Alert color="yellow" icon={<CircleAlert size={18} />}>
          {t('used_warning', { count: leaveType.requestsCount })}
        </Alert>
      )}
      <TextInput
        label={t('field_name')}
        withAsterisk
        description={t('field_name_hint')}
        autoComplete="off"
        {...form.getInputProps('name')}
        error={nameError()}
      />
      <Radio.Group label={t('field_day_count')} {...form.getInputProps('dayCount')} error={fieldError(t, form.errors.dayCount)}>
        <Stack gap="xs" mt={6}>
          {LEAVE_DAY_COUNTS.map((d) => (
            <Radio key={d} value={d} label={t(`day_count.${d}`)} description={t(`day_count_hint.${d}`)} />
          ))}
        </Stack>
      </Radio.Group>
      <Switch
        label={t('field_approval')}
        description={t('field_approval_hint')}
        {...form.getInputProps('requiresApproval', { type: 'checkbox' })}
      />
      <Switch
        label={t('field_deducts')}
        description={t('field_deducts_hint')}
        {...form.getInputProps('deductsPool', { type: 'checkbox' })}
      />
      <NumberInput
        label={t('field_limit')}
        description={t('field_limit_hint')}
        min={LEAVE_TYPE_LIMIT_MIN}
        max={LEAVE_TYPE_LIMIT_MAX}
        allowDecimal={false}
        allowNegative={false}
        // Bez samoczynnego poprawiania na 1 albo 365: wartość spoza zakresu pokazuje błąd pod polem.
        clampBehavior="none"
        suffix={t('field_limit_suffix')}
        w={{ base: '100%', xs: 220 }}
        {...form.getInputProps('yearlyLimit')}
        error={fieldError(t, form.errors.yearlyLimit)}
      />
      <ColorSwatchPicker
        label={t('field_color')}
        description={t('field_color_hint')}
        colors={LEAVE_TYPE_COLORS}
        value={form.values.color}
        onChange={(color) => form.setFieldValue('color', color)}
        labelOf={(color) => t(`colors.${color}`)}
      />
    </FormModal>
  );
};
