import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { Alert, Text, Textarea } from '@mantine/core';
import { CircleAlert, Clock } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { LEAVE_DECISION_REASON_MAX, LEAVE_REQUESTS_MESSAGES, leaveDecisionReasonSchema, todayIsoDate, translateKey, type LeaveDecisionReasonInput, type LeaveRequestListItem } from '@app/shared';
import { ConfirmModal } from '../../../common/ConfirmModal';
import { LeaveDates } from '../../../common/LeaveRequestParts';
import { apiErrorBody, apiErrorFields, apiErrorKey, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useApproveRequest, useCancelRequest, useLeaveRequest, useRejectRequest } from '../leave-requests.api';
import { isLate } from './LeaveRequestsTable';

interface ModalProps {
  request: LeaveRequestListItem;
  /** Zamyka samo okno. */
  onClose: () => void;
  /** Po udanej decyzji: zamyka też szczegóły wniosku. */
  onDone: () => void;
}

/** Ile dni zarezerwował wniosek w puli (typ bez odejmowania: 0). */
const reserved = (r: LeaveRequestListItem) => r.daysFromCarried + r.daysFromAnnual;

const Summary = ({ r }: { r: LeaveRequestListItem }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Text>
      {r.employeeName}: {r.leaveTypeName}, <LeaveDates from={r.dateFrom} to={r.dateTo} /> ({t('days', { count: r.workingDays })}).
    </Text>
  );
};

/**
 * Wspólne zakończenie decyzji: sukces → dymek, zamknięcie okna i szczegółów; 409 `already_decided` (ktoś był
 * szybszy albo pracownik wycofał) → dymek, zamknięcie okna, szczegóły zostają z odświeżonym stanem; inny błąd →
 * dymek albo błąd pod polem, okno zostaje.
 */
const useOutcome = (t: TFunction, { onClose, onDone }: Pick<ModalProps, 'onClose' | 'onDone'>, onFieldError?: (key: string) => void) => ({
  onSuccess: (message: string) => () => {
    notify.success(message);
    onClose();
    onDone();
  },
  onError: (error: unknown) => {
    const body = apiErrorBody(error) ?? {};
    if (apiErrorKey(error) === LEAVE_REQUESTS_MESSAGES.alreadyDecided) {
      notify.error(
        body.current === 'withdrawn'
          ? t('withdrawn_meanwhile')
          : typeof body.decidedByName === 'string'
            ? t('already_decided', { name: body.decidedByName })
            : translateKey(t, LEAVE_REQUESTS_MESSAGES.alreadyDecided),
      );
      onClose();
      return;
    }
    const field = apiErrorFields(error)?.reason;
    if (field && onFieldError) return onFieldError(field);
    const key = apiErrorKey(error);
    notify.error(key ? translateKey(t, key, body) : apiErrorMessage(error, t));
  },
});

/** „Zatwierdzić wniosek?” (odpowiedź 1b): kto, co, kiedy, kto jeszcze ma wtedy urlop, ostrzeżenie przy minionym terminie. */
export const ApproveModal = ({ request: r, ...props }: ModalProps) => {
  const { t } = useTranslation('leave-requests');
  const approve = useApproveRequest();
  const others = useLeaveRequest(r.id).data?.others.filter((o) => o.status === 'approved') ?? [];
  const outcome = useOutcome(t, props);
  const names = [...new Set(others.map((o) => o.employeeName))].join(', ');
  return (
    <ConfirmModal
      title={t('approve_title')}
      confirmLabel={t('approve')}
      confirmAction="confirm"
      confirmColor="green"
      cancelLabel={t('back')}
      loading={approve.isPending}
      onConfirm={() => approve.mutate(r.id, { onSuccess: outcome.onSuccess(t('approved_done', { name: r.employeeName })), onError: outcome.onError })}
      onClose={props.onClose}
    >
      <Summary r={r} />
      {isLate(r) && <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>}
      {names && <Text size="sm">{t('approve_others', { names })}</Text>}
      <Text size="sm" c="dimmed">{t('approve_text')}</Text>
    </ConfirmModal>
  );
};

/**
 * Pole powodu: formularz z tym samym schematem co serwer (`leaveDecisionReasonSchema`), błąd pod polem dopiero po
 * kliknięciu przycisku; do serwera idzie tekst bez spacji na brzegach.
 */
const useReason = () => {
  const form = useForm<LeaveDecisionReasonInput>({ initialValues: { reason: '' }, validate: zod4Resolver(leaveDecisionReasonSchema) });
  return {
    form,
    check: (): string | null => (form.validate().hasErrors ? null : leaveDecisionReasonSchema.parse(form.values).reason),
    /** Błąd pola z serwera (400): klucz tekstu. */
    setError: (key: string) => form.setFieldError('reason', key),
  };
};

const ReasonField = ({ label, hint, reason }: { label: string; hint: string; reason: ReturnType<typeof useReason> }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Textarea
      label={label}
      description={hint}
      withAsterisk
      rows={3}
      maxLength={LEAVE_DECISION_REASON_MAX}
      {...reason.form.getInputProps('reason')}
      error={fieldError(t, reason.form.errors.reason)}
    />
  );
};

/** „Odrzucenie wniosku”: powód obowiązkowy (3a); dni wracają do puli. */
export const RejectModal = ({ request: r, ...props }: ModalProps) => {
  const { t } = useTranslation('leave-requests');
  const reject = useRejectRequest();
  const reason = useReason();
  const outcome = useOutcome(t, props, reason.setError);
  const confirm = () => {
    const text = reason.check();
    if (text !== null) reject.mutate({ id: r.id, reason: text }, { onSuccess: outcome.onSuccess(t('rejected_done', { name: r.employeeName })), onError: outcome.onError });
  };
  return (
    <ConfirmModal title={t('reject_title')} confirmLabel={t('reject_confirm')} confirmAction="cancel" cancelLabel={t('back')} danger loading={reject.isPending} onConfirm={confirm} onClose={props.onClose}>
      <Summary r={r} />
      <ReasonField label={t('reject_reason')} hint={t('reject_hint')} reason={reason} />
      {reserved(r) > 0 && <Text size="sm" c="dimmed">{t('reject_pool', { count: reserved(r) })}</Text>}
    </ConfirmModal>
  );
};

/** „Anulowanie urlopu”: powód obowiązkowy (5a), ostrzeżenie przy urlopie, który już się zaczął (4a); dni wracają. */
export const CancelModal = ({ request: r, ...props }: ModalProps) => {
  const { t } = useTranslation('leave-requests');
  const cancel = useCancelRequest();
  const reason = useReason();
  const outcome = useOutcome(t, props, reason.setError);
  const started = r.dateFrom <= todayIsoDate();
  const days = reserved(r);
  const confirm = () => {
    const text = reason.check();
    if (text !== null) cancel.mutate({ id: r.id, reason: text }, { onSuccess: outcome.onSuccess(t('cancelled_done', { name: r.employeeName })), onError: outcome.onError });
  };
  return (
    <ConfirmModal title={t('cancel_title')} confirmLabel={t('cancel_leave')} confirmAction="cancel" cancelLabel={t('back')} danger loading={cancel.isPending} onConfirm={confirm} onClose={props.onClose}>
      <Summary r={r} />
      {started && <Alert color="yellow" variant="light" icon={<CircleAlert size={18} />}>{t('cancel_started')}</Alert>}
      <Text size="sm">
        {days === 0
          ? t('cancel_no_pool')
          : r.poolLeft
            ? t('cancel_pool', { count: days, name: r.employeeName, left: r.poolLeft.left + days })
            : t('reject_pool', { count: days })}
      </Text>
      <ReasonField label={t('cancel_reason')} hint={t('cancel_hint')} reason={reason} />
    </ConfirmModal>
  );
};
