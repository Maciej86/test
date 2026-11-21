import { useState } from 'react';
import { Alert, Text, Textarea } from '@mantine/core';
import { CircleAlert, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LEAVE_DECISION_REASON_MAX, leaveDaysText, type LeaveDayCount } from '@app/shared';
import { ConfirmModal } from '../ConfirmModal';
import { LeaveDates } from '../LeaveRequestParts';
import { notify } from '../notify';

/** Najkrótszy powód odrzucenia albo anulowania (jak w schemacie serwera). */
const REASON_MIN = 3;

/** Wniosek w oknie decyzji: dane gotowe do pokazania (makieta nie liczy puli sama). */
export interface DecisionRequest {
  employee: string;
  type: string;
  from: string;
  to: string;
  days: number;
  dayCount?: LeaveDayCount;
  /** Ile dni wniosek zarezerwował w puli (typ bez odejmowania: 0). */
  reserved: number;
  /** Czekający z terminem przed dziś. */
  late: boolean;
  /** Urlop już się zaczął (ostrzeżenie przy anulowaniu). */
  started: boolean;
  /** Osoby z zatwierdzonym urlopem w tym samym czasie. */
  othersApproved: string[];
  /** Ile dni zostało teraz w puli pracownika (bez puli: brak). */
  poolLeft?: number;
}

interface ModalProps {
  request: DecisionRequest;
  onClose: () => void;
}

const Summary = ({ r }: { r: DecisionRequest }) => {
  const { t } = useTranslation('leave-requests');
  return (
    <Text>
      {r.employee}: {r.type}, <LeaveDates from={r.from} to={r.to} /> ({leaveDaysText(t, r.days, r.dayCount)}).
    </Text>
  );
};

/** „Zatwierdzić wniosek?” (odpowiedź 1b): kto, co, kiedy, kto jeszcze ma wtedy urlop, ostrzeżenie przy minionym terminie. */
export const ApproveModal = ({ request: r, onClose }: ModalProps) => {
  const { t } = useTranslation('leave-requests');
  const names = [...new Set(r.othersApproved)].join(', ');
  return (
    <ConfirmModal
      title={t('approve_title')}
      confirmLabel={t('approve')}
      confirmAction="confirm"
      confirmColor="green"
      cancelLabel={t('back')}
      onConfirm={() => { notify.success(t('approved_done', { name: r.employee })); onClose(); }}
      onClose={onClose}
    >
      <Summary r={r} />
      {r.late && <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>}
      {names && <Text size="sm">{t('approve_others', { names })}</Text>}
      <Text size="sm" c="dimmed">{t('approve_text')}</Text>
    </ConfirmModal>
  );
};

/** Powód decyzji: wymagany; błąd pod polem dopiero po kliknięciu przycisku (`showError`: od razu, stan makiety). */
const useReason = (showError = false) => {
  const { t } = useTranslation('leave-requests');
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(showError);
  const valid = value.trim().length >= REASON_MIN;
  return {
    value,
    setValue,
    error: touched && !valid ? t('reason_required', { min: REASON_MIN }) : null,
    /** Po kliknięciu przycisku: true, gdy powód jest dobry. */
    check: () => { setTouched(true); return valid; },
  };
};

const ReasonField = ({ label, hint, reason }: { label: string; hint: string; reason: ReturnType<typeof useReason> }) => (
  <Textarea
    label={label}
    description={hint}
    withAsterisk
    rows={3}
    maxLength={LEAVE_DECISION_REASON_MAX}
    value={reason.value}
    error={reason.error}
    onChange={(e) => reason.setValue(e.currentTarget.value)}
  />
);

/** „Odrzucenie wniosku”: powód obowiązkowy (3a); dni wracają do puli. */
export const RejectModal = ({ request: r, showError, onClose }: ModalProps & { showError?: boolean }) => {
  const { t } = useTranslation('leave-requests');
  const reason = useReason(showError);
  const confirm = () => {
    if (!reason.check()) return;
    notify.success(t('rejected_done', { name: r.employee }));
    onClose();
  };
  return (
    <ConfirmModal title={t('reject_title')} confirmLabel={t('reject_confirm')} confirmAction="cancel" cancelLabel={t('back')} danger onConfirm={confirm} onClose={onClose}>
      <Summary r={r} />
      <ReasonField label={t('reject_reason')} hint={t('reject_hint')} reason={reason} />
      {r.reserved > 0 && <Text size="sm" c="dimmed">{t('reject_pool', { count: r.reserved })}</Text>}
    </ConfirmModal>
  );
};

/** „Anulowanie urlopu”: powód obowiązkowy (5a), ostrzeżenie przy urlopie, który już się zaczął (4a); dni wracają. */
export const CancelModal = ({ request: r, onClose }: ModalProps) => {
  const { t } = useTranslation('leave-requests');
  const reason = useReason();
  const confirm = () => {
    if (!reason.check()) return;
    notify.success(t(r.reserved > 0 ? 'cancelled_done' : 'cancelled_done_no_pool', { name: r.employee }));
    onClose();
  };
  return (
    <ConfirmModal title={t('cancel_title')} confirmLabel={t('cancel_leave')} confirmAction="cancel" cancelLabel={t('back')} danger onConfirm={confirm} onClose={onClose}>
      <Summary r={r} />
      {r.started && <Alert color="yellow" variant="light" icon={<CircleAlert size={18} />}>{t('cancel_started')}</Alert>}
      <Text size="sm">
        {r.reserved === 0
          ? t('cancel_no_pool')
          : r.poolLeft !== undefined
            ? t('cancel_pool', { count: r.reserved, name: r.employee, left: r.poolLeft + r.reserved })
            : t('reject_pool', { count: r.reserved })}
      </Text>
      <ReasonField label={t('cancel_reason')} hint={t('cancel_hint')} reason={reason} />
    </ConfirmModal>
  );
};
