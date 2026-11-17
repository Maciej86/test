import { useState } from 'react';
import { Alert, Button, Grid, Group, Modal, Select, Stack, Textarea } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  checkLeaveRequest,
  LEAVE_REQUEST_COMMENT_MAX,
  leaveRequestSchema,
  todayIsoDate,
  translateKey,
  type MyLeaveOverview,
  type MyLeaveRequest,
} from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateField } from '../../../common/DateField';
import { apiErrorBody, apiErrorFields, apiErrorKey, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useCreateRequest } from '../my-leave.api';
import { DayStrip } from './DayStrip';
import { RequestCheck, type RequestCheckState } from './RequestCheck';

type FormValues = {
  /** Numer typu jako tekst (wartość pola wyboru); schemat zamienia go na liczbę. */
  leaveTypeId: string;
  dateFrom: string | null;
  dateTo: string | null;
  comment: string;
};

/**
 * Okno „Złóż wniosek”: typ, termin z paskiem dni, ramka z liczbą dni (te same obliczenia co serwer) i komentarz.
 * Przycisk działa tylko wtedy, gdy ramka nic nie blokuje; błąd z serwera zostaje w oknie.
 */
export const RequestModal = ({
  overview,
  onClose,
  onSubmitted,
}: {
  overview: MyLeaveOverview;
  onClose: () => void;
  /** Po zapisie, np. żeby lista pokazała rok nowego wniosku. */
  onSubmitted?: (request: MyLeaveRequest) => void;
}) => {
  const { t } = useTranslation('my-leave');
  const create = useCreateRequest();
  const [serverError, setServerError] = useState<string | null>(null);
  const today = todayIsoDate();
  const { pool } = overview;
  const form = useForm<FormValues>({
    initialValues: { leaveTypeId: overview.types[0] ? String(overview.types[0].id) : '', dateFrom: null, dateTo: null, comment: '' },
    validate: zod4Resolver(leaveRequestSchema),
    onValuesChange: () => setServerError(null),
  });
  const { leaveTypeId, dateFrom, dateTo } = form.values;
  const type = overview.types.find((lt) => String(lt.id) === leaveTypeId);

  const check: RequestCheckState =
    !type || !dateFrom || !dateTo
      ? { kind: 'empty' }
      : dateTo < dateFrom
        ? { kind: 'order' }
        : checkLeaveRequest(
            { type, dateFrom, dateTo, today },
            {
              poolYear: pool.year,
              annualDays: pool.annualDays,
              carriedDays: pool.carriedDays,
              usedCarried: pool.usedCarried,
              usedAnnual: pool.usedAnnual,
              pendingCarried: pool.pendingCarried,
              pendingAnnual: pool.pendingDays - pool.pendingCarried,
              busy: overview.busy,
            },
          );

  const typeHint = type
    ? [
        type.deductsPool ? t('type_deducts') : t('type_not_deducts'),
        type.yearlyLimit !== null ? t('type_limit', { used: type.usedOfLimit, limit: type.yearlyLimit, year: pool.year }) : null,
      ]
        .filter(Boolean)
        .join(t('check_and'))
    : undefined;

  const setDateFrom = (value: string | null) => {
    form.setFieldValue('dateFrom', value);
    if (value && (!dateTo || dateTo < value)) form.setFieldValue('dateTo', value);
  };

  const submit = form.onSubmit((values) => {
    // Po sprawdzeniu schematem obie daty są już wypełnione.
    create.mutate({ ...values, dateFrom: values.dateFrom ?? '', dateTo: values.dateTo ?? '' }, {
      onSuccess: (saved) => {
        notify.success(t('submitted'));
        onSubmitted?.(saved);
        onClose();
      },
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) return form.setErrors(fields);
        const key = apiErrorKey(error);
        setServerError(key ? translateKey(t, key, apiErrorBody(error) ?? {}) : apiErrorMessage(error, t));
      },
    });
  });

  return (
    <Modal opened onClose={onClose} title={t('new_request')} size="lg">
      <form onSubmit={submit} noValidate>
        <Stack>
          <Select
            label={t('field_type')}
            data={overview.types.map((lt) => ({ value: String(lt.id), label: lt.name }))}
            {...form.getInputProps('leaveTypeId')}
            error={fieldError(t, form.errors.leaveTypeId)}
            description={typeHint}
            allowDeselect={false}
            required
          />
          <Grid>
            <Grid.Col span={{ base: 12, xs: 6 }}>
              <DateField
                label={t('field_from')}
                value={dateFrom}
                onChange={setDateFrom}
                minDate={today}
                error={fieldError(t, form.errors.dateFrom)}
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xs: 6 }}>
              <DateField
                label={t('field_to')}
                value={dateTo}
                onChange={(v) => form.setFieldValue('dateTo', v)}
                minDate={dateFrom ?? today}
                error={check.kind === 'order' ? t('error_order') : fieldError(t, form.errors.dateTo)}
                required
              />
            </Grid.Col>
          </Grid>

          {dateFrom && dateTo && check.kind !== 'order' && <DayStrip from={dateFrom} to={dateTo} />}
          {serverError ? (
            <Alert color="red" variant="light" icon={<AlertTriangle size={18} />}>{serverError}</Alert>
          ) : (
            <RequestCheck check={check} poolYear={pool.year} typeName={type?.name ?? ''} />
          )}

          <Textarea
            label={t('field_comment')}
            description={t('field_comment_hint')}
            rows={3}
            maxLength={LEAVE_REQUEST_COMMENT_MAX}
            {...form.getInputProps('comment')}
            error={fieldError(t, form.errors.comment)}
          />
          <Group justify="flex-end">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action="send" />} disabled={check.kind !== 'ok'} loading={create.isPending}>
              {t('submit')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
