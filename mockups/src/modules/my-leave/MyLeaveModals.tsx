import { useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Divider, Grid, Group, Modal, Paper, Select, SimpleGrid, Stack, Text, Textarea, Title } from '@mantine/core';
import { AlertTriangle, CalendarRange, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { countWorkingDays, dayjs, leaveDaysText } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { ConfirmModal } from '../../common/ConfirmModal';
import { DateField } from '../../common/DateField';
import { DateText } from '../../common/DateText';
import { notify } from '../../common/notify';
import { DayStrip } from './DayStrip';
import { LEAVE_TYPES, MY_REQUESTS, POOL, type MockRequest } from './data';

export const COMMENT_MAX = 500;

type Check =
  | { kind: 'empty' }
  | { kind: 'ok'; days: number; fromCarried: number; fromAnnual: number; leftAfter: number | null }
  | { kind: 'no_days' }
  | { kind: 'not_enough'; days: number; left: number }
  | { kind: 'limit'; days: number; limit: number; used: number; type: string }
  | { kind: 'overlap'; request: MockRequest }
  | { kind: 'other_year'; year: number }
  | { kind: 'order' };

/** To samo, co w aplikacji policzy serwer przy złożeniu; okno pokazuje to na bieżąco, zanim pracownik kliknie. */
const checkRequest = (typeId: string | null, from: string | null, to: string | null): Check => {
  const type = LEAVE_TYPES.find((lt) => String(lt.id) === typeId);
  if (!type || !from || !to) return { kind: 'empty' };
  if (to < from) return { kind: 'order' };
  if (dayjs(from).year() !== POOL.year || dayjs(to).year() !== POOL.year) return { kind: 'other_year', year: dayjs(to).year() };

  const overlap = MY_REQUESTS.find((r) => (r.status === 'pending' || r.status === 'approved') && r.from <= to && r.to >= from);
  if (overlap) return { kind: 'overlap', request: overlap };

  const days = countWorkingDays(from, to);
  if (days === 0) return { kind: 'no_days' };

  if (type.limit !== null && type.usedOfLimit + days > type.limit) {
    return { kind: 'limit', days, limit: type.limit, used: type.usedOfLimit, type: type.name };
  }
  if (!type.deducts) return { kind: 'ok', days, fromCarried: 0, fromAnnual: 0, leftAfter: null };

  const carriedLeft = POOL.carried - POOL.usedCarried;
  const left = POOL.annual + POOL.carried - POOL.usedCarried - POOL.usedAnnual - POOL.pending;
  if (days > left) return { kind: 'not_enough', days, left };
  const fromCarried = Math.min(days, carriedLeft);
  return { kind: 'ok', days, fromCarried, fromAnnual: days - fromCarried, leftAfter: left - days };
};

/** Ramka pod terminem: ile dni, skąd się wezmą, albo co blokuje złożenie i jak to naprawić. */
const CheckBox = ({ check }: { check: Check }) => {
  const { t } = useTranslation('my-leave');
  switch (check.kind) {
    case 'empty':
      return <Text size="sm" c="dimmed">{t('check_empty')}</Text>;
    case 'ok':
      return (
        <Alert color="navy" variant="light" icon={<CalendarRange size={18} />} title={leaveDaysText(t, check.days)}>
          {check.leftAfter === null
            ? t('check_no_pool')
            : [
                check.fromCarried > 0 ? t('check_from_carried', { count: check.fromCarried }) : null,
                check.fromAnnual > 0 ? t('check_from_annual', { count: check.fromAnnual, year: POOL.year }) : null,
              ].filter(Boolean).join(t('check_and')) + t('check_left_after', { count: check.leftAfter })}
        </Alert>
      );
    case 'no_days':
      return <Alert color="red" variant="light" icon={<AlertTriangle size={18} />} title={t('check_no_days_title')}>{t('check_no_days')}</Alert>;
    case 'order':
      return null;
    case 'not_enough':
      return (
        <Alert color="red" variant="light" icon={<AlertTriangle size={18} />} title={t('check_not_enough_title', { count: check.days })}>
          {t('check_not_enough', { left: check.left, pending: POOL.pending })}
        </Alert>
      );
    case 'limit':
      return (
        <Alert color="red" variant="light" icon={<AlertTriangle size={18} />} title={t('check_limit_title', { type: check.type })}>
          {t('check_limit', { limit: check.limit, used: check.used, days: check.days, year: POOL.year })}
        </Alert>
      );
    case 'overlap':
      return (
        <Alert color="red" variant="light" icon={<AlertTriangle size={18} />} title={t('check_overlap_title')}>
          {t('check_overlap', { type: check.request.type, status: t(`status.${check.request.status}`) })}{' '}
          <DateText value={check.request.from} /> – <DateText value={check.request.to} />.
        </Alert>
      );
    case 'other_year':
      return (
        <Alert color="yellow" variant="light" icon={<Info size={18} />} title={t('check_other_year_title', { year: check.year })}>
          {t('check_other_year', { year: check.year, open: POOL.year })}
        </Alert>
      );
  }
};

export const RequestModal = ({ initial, onClose }: {
  initial: { typeId: string; from: string; to: string; comment: string } | null;
  onClose: () => void;
}) => {
  const { t } = useTranslation('my-leave');
  const [typeId, setTypeId] = useState<string | null>(initial?.typeId ?? '1');
  const [from, setFrom] = useState<string | null>(initial?.from ?? null);
  const [to, setTo] = useState<string | null>(initial?.to ?? null);
  const [comment, setComment] = useState(initial?.comment ?? '');

  const type = LEAVE_TYPES.find((lt) => String(lt.id) === typeId);
  const check = checkRequest(typeId, from, to);
  const typeHint = !type
    ? undefined
    : [
        type.deducts ? t('type_deducts') : t('type_not_deducts'),
        type.limit !== null ? t('type_limit', { used: type.usedOfLimit, limit: type.limit, year: POOL.year }) : null,
      ].filter(Boolean).join(t('check_and'));

  const submit = () => {
    notify.success(t('submitted'));
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title={t('new_request')} size="lg">
      <Stack>
        <Select
          label={t('field_type')}
          data={LEAVE_TYPES.map((lt) => ({ value: String(lt.id), label: lt.name }))}
          value={typeId}
          onChange={setTypeId}
          description={typeHint}
          allowDeselect={false}
          required
        />
        <Grid>
          <Grid.Col span={{ base: 12, xs: 6 }}>
            <DateField
              label={t('field_from')}
              value={from}
              onChange={(v) => {
                setFrom(v);
                if (v && (!to || to < v)) setTo(v);
              }}
              minDate={new Date('2026-11-17')}
              required
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, xs: 6 }}>
            <DateField
              label={t('field_to')}
              value={to}
              onChange={setTo}
              minDate={from ? new Date(from) : new Date('2026-11-17')}
              error={check.kind === 'order' ? t('error_order') : undefined}
              required
            />
          </Grid.Col>
        </Grid>

        {from && to && check.kind !== 'order' && <DayStrip from={from} to={to} />}
        <CheckBox check={check} />

        <Textarea
          label={t('field_comment')}
          description={t('field_comment_hint')}
          autosize
          minRows={2}
          maxLength={COMMENT_MAX}
          value={comment}
          onChange={(e) => setComment(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="send" />} disabled={check.kind !== 'ok'} onClick={submit}>{t('submit')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const WithdrawModal = ({ request, onClose }: { request: MockRequest | null; onClose: () => void }) => {
  const { t } = useTranslation('my-leave');
  if (!request) return null;
  return (
    <ConfirmModal
      title={t('withdraw_title')}
      confirmLabel={t('withdraw')}
      confirmAction="cancel"
      cancelLabel={t('keep')}
      danger
      onConfirm={() => { notify.success(t('withdrawn_done')); onClose(); }}
      onClose={onClose}
    >
      <Text>
        {request.type}, <DateText value={request.from} /> – <DateText value={request.to} />{' '}
        ({leaveDaysText(t, request.days)}).
      </Text>
      <Text size="sm" c="dimmed">{t('withdraw_text', { count: request.fromCarried + request.fromAnnual })}</Text>
    </ConfirmModal>
  );
};

/** Jedna linia na kartce: opis po lewej, wartość po prawej. */
const PaperRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <Grid gap="xs">
    <Grid.Col span={{ base: 12, xs: 4 }}><Text size="sm" c="gray.7">{label}</Text></Grid.Col>
    <Grid.Col span={{ base: 12, xs: 8 }}><Text size="sm" fw={500}>{children}</Text></Grid.Col>
  </Grid>
);

/**
 * Podgląd PDF zatwierdzonego wniosku: jasna kartka (wydruk jest zawsze jasny), dane wniosku, decyzja i miejsca
 * na podpisy. W aplikacji przycisk otwiera PDF w nowej karcie; tam drukuje się albo zapisuje plik.
 */
export const PrintPreview = ({ request, onClose }: { request: MockRequest | null; onClose: () => void }) => {
  const { t } = useTranslation('my-leave');
  return (
    <Modal opened={request !== null} onClose={onClose} title={t('print_title')} size="xl">
      {request && (
        <Stack>
          <Text size="sm" c="dimmed">{t('print_hint')}</Text>
          <Paper bg="gray.0" c="dark.9" p={{ base: 'md', sm: 40 }} withBorder>
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <Text size="sm" c="gray.7">{t('common:app_name')}</Text>
                <Text size="sm" c="gray.7">{t('print_place_date')} <DateText value={request.createdAt.slice(0, 10)} /></Text>
              </Group>
              <Stack gap={4} align="center">
                <Title order={2} c="dark.9">{t('print_heading')}</Title>
                <Text size="sm" c="gray.7">{t('print_number', { id: request.id })}</Text>
              </Stack>
              <Stack gap={6}>
                <PaperRow label={t('print_employee')}>Jan Kowalski</PaperRow>
                <PaperRow label={t('field_type')}>{request.type}</PaperRow>
                <PaperRow label={t('col_dates')}><DateText value={request.from} /> – <DateText value={request.to} /></PaperRow>
                <PaperRow label={t('col_days')}>
                  {leaveDaysText(t, request.days)}
                  {request.fromCarried + request.fromAnnual > 0 && (
                    <> ({[
                      request.fromCarried > 0 ? t('split_carried', { count: request.fromCarried }) : null,
                      request.fromAnnual > 0 ? t('split_annual', { count: request.fromAnnual, year: POOL.year }) : null,
                    ].filter(Boolean).join(t('check_and'))})</>
                  )}
                </PaperRow>
                {request.comment && <PaperRow label={t('field_comment_short')}>{request.comment}</PaperRow>}
                <PaperRow label={t('print_decision')}>
                  {t('print_approved_by', { name: request.decidedBy })} <DateText value={request.decidedAt?.slice(0, 10)} />
                </PaperRow>
              </Stack>
              <Divider color="gray.4" />
              <SimpleGrid cols={2} spacing={40} pt={40}>
                {[t('print_sign_employee'), t('print_sign_manager')].map((label) => (
                  <Stack key={label} gap={4}>
                    <Divider color="gray.6" variant="dotted" />
                    <Text size="xs" c="gray.7" ta="center">{label}</Text>
                  </Stack>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>
          <Group justify="flex-end">
            <Badge variant="light" color="gray">{t('print_mockup_note')}</Badge>
            <Button variant="default" onClick={onClose}>{t('close')}</Button>
            <Button leftSection={<ButtonIcon action="print" />} onClick={onClose}>{t('print_open')}</Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
};
