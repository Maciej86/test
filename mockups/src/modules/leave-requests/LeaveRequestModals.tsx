import { useState } from 'react';
import { Alert, Stack, Text, Textarea } from '@mantine/core';
import { CircleAlert, Clock } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateText } from '../../common/DateText';
import { notify } from '../../common/notify';
import type { LeaveRequestView } from '../../common/LeaveRequestDrawer';
import { OPEN_YEAR, POOLS, TODAY, overlapping, poolLeft, type MockRequest } from './data';

export { LEAVE_STATUS_COLOR as STATUS_COLOR } from '../../common/LeaveRequestDrawer';

export const REASON_MIN = 3;
export const REASON_MAX = 500;

/** Termin: jeden dzień bez „–”. */
export const Term = ({ r }: { r: MockRequest }) => (
  <>
    <DateText value={r.from} />
    {r.to !== r.from && <> – <DateText value={r.to} /></>}
  </>
);

/** „2 z puli 2026”, „4 z zaległego i 2 z puli 2026” albo „nie odejmuje z puli”. */
export const splitText = (r: MockRequest, t: TFunction) => {
  if (!r.deducts) return t('split_none');
  return [
    r.fromCarried > 0 ? t('split_carried', { count: r.fromCarried }) : null,
    r.fromAnnual > 0 ? t('split_annual', { count: r.fromAnnual, year: OPEN_YEAR }) : null,
  ].filter(Boolean).join(t('and'));
};

/** Czekający wniosek z terminem przed dziś: można go rozpatrzyć, ale administrator powinien to widzieć. */
export const isLate = (r: MockRequest) => r.status === 'pending' && r.from < TODAY;

/** Wniosek makiety w postaci wspólnego panelu szczegółów (`common/LeaveRequestDrawer`). */
export const toView = (r: MockRequest, t: TFunction): LeaveRequestView => {
  const pool = POOLS[r.employee];
  const active = r.status === 'pending' || r.status === 'approved';
  return {
    id: r.id,
    employee: r.employee,
    status: r.status,
    from: r.from,
    to: r.to,
    typeLine: `${r.type}, ${t('days', { count: r.days })} (${splitText(r, t)})`,
    late: isLate(r),
    comment: r.comment,
    createdAt: r.createdAt,
    decided: r.decidedBy && r.decidedAt ? { by: r.decidedBy, at: r.decidedAt } : undefined,
    reason: r.reason,
    pool: pool && active
      ? {
          year: OPEN_YEAR,
          used: pool.used,
          pending: pool.pending,
          left: poolLeft(pool),
          total: pool.annual + pool.carried,
          carried: pool.carried,
          note: r.deducts ? t('pool_after_approve', { count: poolLeft(pool) }) : t('pool_no_deduct'),
        }
      : undefined,
  };
};

/** Powód decyzji: wymagany, 3–500 znaków; błąd pod polem dopiero po kliknięciu przycisku. */
const ReasonField = ({ label, hint, value, error, onChange }: { label: string; hint: string; value: string; error: string | null; onChange: (v: string) => void }) => (
  <Textarea label={label} description={hint} withAsterisk autosize minRows={3} maxLength={REASON_MAX} value={value} error={error} onChange={(e) => onChange(e.currentTarget.value)} />
);

/** `showError` = stan makiety „puste pole po kliknięciu”, od razu z błędem pod polem. */
const useReason = (showError = false) => {
  const { t } = useTranslation('leave-requests');
  const [value, setValue] = useState('');
  const [touched, setTouched] = useState(showError);
  const error = touched && value.trim().length < REASON_MIN ? t('reason_required', { min: REASON_MIN }) : null;
  return { value, setValue, error, touch: () => setTouched(true), valid: value.trim().length >= REASON_MIN };
};

export const RejectModal = ({ request: r, showError, onClose }: { request: MockRequest; showError?: boolean; onClose: () => void }) => {
  const { t } = useTranslation('leave-requests');
  const reason = useReason(showError);
  const confirm = () => {
    reason.touch();
    if (!reason.valid) return;
    notify.success(t('rejected_done', { name: r.employee }));
    onClose();
  };
  return (
    <ConfirmModal title={t('reject_title')} confirmLabel={t('reject_confirm')} confirmAction="cancel" cancelLabel={t('back')} danger onConfirm={confirm} onClose={onClose}>
      <Text>{r.employee}: {r.type}, <Term r={r} /> ({t('days', { count: r.days })}).</Text>
      <ReasonField
        label={t('reject_reason')}
        hint={t('reject_hint')}
        value={reason.value}
        error={reason.error}
        onChange={reason.setValue}
      />
      {r.deducts && <Text size="sm" c="dimmed">{t('reject_pool', { count: r.days })}</Text>}
    </ConfirmModal>
  );
};

export const CancelModal = ({ request: r, onClose }: { request: MockRequest; onClose: () => void }) => {
  const { t } = useTranslation('leave-requests');
  const reason = useReason();
  const pool = POOLS[r.employee]!;
  const started = r.from <= TODAY;
  const confirm = () => {
    reason.touch();
    if (!reason.valid) return;
    notify.success(t('cancelled_done', { name: r.employee }));
    onClose();
  };
  return (
    <ConfirmModal title={t('cancel_title')} confirmLabel={t('cancel_leave')} confirmAction="cancel" cancelLabel={t('back')} danger onConfirm={confirm} onClose={onClose}>
      <Text>{r.employee}: {r.type}, <Term r={r} /> ({t('days', { count: r.days })}).</Text>
      {started && (
        <Alert color="yellow" variant="light" icon={<CircleAlert size={18} />}>{t('cancel_started')}</Alert>
      )}
      <Text size="sm">
        {r.deducts ? t('cancel_pool', { count: r.days, name: r.employee, left: poolLeft(pool) + r.days }) : t('cancel_no_pool')}
      </Text>
      <ReasonField label={t('cancel_reason')} hint={t('cancel_hint')} value={reason.value} error={reason.error} onChange={reason.setValue} />
    </ConfirmModal>
  );
};

/** Potwierdzenie zatwierdzenia (odpowiedź 1b): co zatwierdzam i co się stanie. */
export const ApproveModal = ({ request: r, onClose }: { request: MockRequest; onClose: () => void }) => {
  const { t } = useTranslation('leave-requests');
  const others = overlapping(r).filter((o) => o.status === 'approved');
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
      <Text>{r.employee}: {r.type}, <Term r={r} /> ({t('days', { count: r.days })}).</Text>
      {isLate(r) && <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>}
      {others.length > 0 && (
        <Text size="sm">{t('approve_others', { names: [...new Set(others.map((o) => o.employee))].join(', ') })}</Text>
      )}
      <Text size="sm" c="dimmed">{t('approve_text')}</Text>
    </ConfirmModal>
  );
};
