import { useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Divider, Drawer, Group, Paper, Progress, Stack, Text, Textarea } from '@mantine/core';
import { CircleAlert, Clock } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateText } from '../../common/DateText';
import { notify } from '../../common/notify';
import { TeamStrip } from './TeamStrip';
import { OPEN_YEAR, POOLS, TODAY, overlapping, poolLeft, type LeaveStatus, type MockRequest } from './data';

/** Kolory statusów z księgi wyglądu (DESIGN.md, „Statusy”). */
export const STATUS_COLOR: Record<LeaveStatus, string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  withdrawn: 'gray',
  cancelled: 'red',
};

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

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Group gap="md" align="flex-start" wrap="nowrap">
    <Text size="sm" c="dimmed" w={130} style={{ flex: 'none' }}>{label}</Text>
    <Text size="sm" component="div" style={{ flex: 1 }}>{children}</Text>
  </Group>
);

/** Pula osoby: ile ma teraz i ile zostanie po zatwierdzeniu tego wniosku. */
const PoolBox = ({ r }: { r: MockRequest }) => {
  const { t } = useTranslation('leave-requests');
  const pool = POOLS[r.employee]!;
  const total = pool.annual + pool.carried;
  const left = poolLeft(pool);
  const pct = (d: number) => (d / total) * 100;
  return (
    <Paper withBorder p="md" bg="var(--app-panel-background)">
      <Stack gap={6}>
        <Group justify="space-between" align="baseline">
          <Text size="sm" fw={600}>{t('pool_title', { year: OPEN_YEAR })}</Text>
          <Text size="sm"><Text span fw={700} fz="lg">{left}</Text> <Text span c="dimmed">{t('pool_of', { total })}</Text></Text>
        </Group>
        <Progress.Root size={8} radius="xs" aria-label={t('pool_aria', { left, total })}>
          <Progress.Section value={pct(pool.used)} color="dark.4" />
          <Progress.Section value={pct(pool.pending)} color="yellow.6" />
          <Progress.Section value={pct(left)} color="navy.6" />
        </Progress.Root>
        <Text size="xs" c="dimmed">{t('pool_line', { used: pool.used, pending: pool.pending, carried: pool.carried })}</Text>
        {r.status === 'pending' && r.deducts && <Text size="sm">{t('pool_after_approve', { count: left })}</Text>}
        {r.status === 'pending' && !r.deducts && <Text size="sm">{t('pool_no_deduct')}</Text>}
      </Stack>
    </Paper>
  );
};

interface DetailsProps {
  request: MockRequest | null;
  onClose: () => void;
  onApprove: (r: MockRequest) => void;
  onReject: (r: MockRequest) => void;
  onCancel: (r: MockRequest) => void;
}

/**
 * Szczegóły wniosku z prawej strony (na telefonie na cały ekran). Otwiera je kliknięcie wiersza, link z e-maila
 * i z powiadomienia (adres `/admin/leave-requests/24`). Tu administrator decyduje.
 */
export const DetailsDrawer = ({ request: r, onClose, onApprove, onReject, onCancel }: DetailsProps) => {
  const { t } = useTranslation('leave-requests');
  const others = r ? overlapping(r) : [];
  return (
    <Drawer
      opened={r !== null}
      onClose={onClose}
      position="right"
      size="xl"
      title={r && <Text span ff="heading" fz="h3" fw={600}>{t('details_title', { id: r.id })}</Text>}
    >
      {r && (
        <Stack gap="lg">
          <Stack gap={4}>
            <Group justify="space-between" align="flex-start">
              <Text fw={700} fz="xl">{r.employee}</Text>
              <Badge color={STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
            </Group>
            <Text fz="lg"><Term r={r} /></Text>
            <Text c="dimmed">{r.type}, {t('days', { count: r.days })} ({splitText(r, t)})</Text>
          </Stack>

          {isLate(r) && (
            <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>
          )}

          {(r.status === 'pending' || r.status === 'approved') && (
            <Stack gap="xs">
              <Text fw={600}>{t('strip_title')}</Text>
              <TeamStrip request={r} others={others} />
            </Stack>
          )}

          {(r.status === 'pending' || r.status === 'approved') && <PoolBox r={r} />}

          <Stack gap={8}>
            {r.comment && <Row label={t('comment')}>{r.comment}</Row>}
            <Row label={t('submitted')}><DateText value={r.createdAt} withTime /></Row>
            {r.decidedBy && (
              <Row label={t(`decided_${r.status}`)}>{r.decidedBy}, <DateText value={r.decidedAt} withTime /></Row>
            )}
            {r.reason && <Row label={t('reason')}>„{r.reason}”</Row>}
          </Stack>

          {r.status === 'pending' && (
            <>
              <Divider />
              <Group justify="flex-end">
                <Button variant="default" color="red" leftSection={<ButtonIcon action="cancel" />} onClick={() => onReject(r)}>{t('reject')}</Button>
                <Button color="green" leftSection={<ButtonIcon action="confirm" />} onClick={() => onApprove(r)}>
                  {t('approve')}
                </Button>
              </Group>
            </>
          )}
          {r.status === 'approved' && (
            <>
              <Divider />
              <Group justify="flex-end">
                <Button variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" />} onClick={() => onCancel(r)}>{t('cancel_leave')}</Button>
                <Button variant="default" leftSection={<ButtonIcon action="print" />} onClick={() => notify.success(t('pdf_mockup'))}>{t('pdf')}</Button>
              </Group>
            </>
          )}
        </Stack>
      )}
    </Drawer>
  );
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
