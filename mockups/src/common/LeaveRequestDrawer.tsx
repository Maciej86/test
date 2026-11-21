import type { ReactNode } from 'react';
import { Alert, Badge, Button, Divider, Group, Paper, Progress, Stack, Text } from '@mantine/core';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from './ButtonIcon';
import { DateText } from './DateText';
import { DetailRow } from './DetailRow';
import { SideDrawer } from './SideDrawer';

/** Wniosek w szczegółach: dane gotowe do pokazania (makieta nie liczy puli ani statusów sama). */
export interface LeaveRequestView {
  id: number;
  employee: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';
  from: string;
  to: string;
  /** „Wypoczynkowy, 5 dni roboczych (z puli 2026)”. */
  typeLine: string;
  late?: boolean;
  comment?: string;
  createdAt: string;
  decided?: { by: string; at: string };
  reason?: string;
  /** `note`: zdanie pod paskiem przy czekającym (np. „Po zatwierdzeniu zostanie 15 dni…”). */
  pool?: { year: number; used: number; pending: number; left: number; total: number; carried: number; note?: string };
}

/** Kolory statusów z księgi wyglądu (DESIGN.md, „Statusy”). */
export const LEAVE_STATUS_COLOR: Record<LeaveRequestView['status'], string> = {
  pending: 'yellow',
  approved: 'green',
  rejected: 'red',
  cancelled: 'red',
  withdrawn: 'gray',
};

const PoolBox = ({ r, pool }: { r: LeaveRequestView; pool: NonNullable<LeaveRequestView['pool']> }) => {
  const { t } = useTranslation('leave-requests');
  const pct = (d: number) => (pool.total === 0 ? 0 : (d / pool.total) * 100);
  return (
    <Paper withBorder p="md" bg="var(--app-panel-background)">
      <Stack gap={6}>
        <Group justify="space-between" align="baseline">
          <Text size="sm" fw={600}>{t('pool_title', { year: pool.year })}</Text>
          <Text size="sm"><Text span fw={700} fz="lg">{pool.left}</Text> <Text span c="dimmed">{t('pool_of', { total: pool.total })}</Text></Text>
        </Group>
        <Progress.Root size={8} radius="xs">
          <Progress.Section value={pct(pool.used)} color="dark.4" />
          <Progress.Section value={pct(pool.pending)} color="yellow.6" />
          <Progress.Section value={pct(pool.left)} color="navy.6" />
        </Progress.Root>
        <Text size="xs" c="dimmed">{t(r.status === 'approved' ? 'pool_line_approved' : 'pool_line', { used: pool.used, pending: pool.pending, carried: pool.carried })}</Text>
        {r.status === 'pending' && pool.note && <Text size="sm">{pool.note}</Text>}
      </Stack>
    </Paper>
  );
};

/**
 * Szczegóły wniosku z prawej: ta sama treść we Wnioskach urlopowych i w Kalendarzu (w aplikacji:
 * `common/leave-request/DetailsDrawer`). `strip`: „Kto jeszcze ma wtedy wolne” od ekranu.
 */
export const LeaveRequestDrawer = ({ request: r, strip, onClose, onApprove, onReject, onCancel, onPdf, onShowInCalendar }: {
  request: LeaveRequestView | null;
  strip?: ReactNode;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onPdf: () => void;
  /** Przycisk „Pokaż w kalendarzu” (poza Kalendarzem). */
  onShowInCalendar?: () => void;
}) => {
  const { t } = useTranslation('leave-requests');
  const active = r?.status === 'pending' || r?.status === 'approved';
  return (
    <SideDrawer opened={r !== null} title={r ? t('details_title', { id: r.id }) : ''} onClose={onClose}>
      {r && (
        <Stack gap="lg">
          <Stack gap={4}>
            <Group justify="space-between" align="flex-start">
              <Text fw={700} fz="xl">{r.employee}</Text>
              <Badge color={LEAVE_STATUS_COLOR[r.status]} variant="light">{t(`status.${r.status}`)}</Badge>
            </Group>
            <Text fz="lg"><DateText value={r.from} />{r.to !== r.from && <> – <DateText value={r.to} /></>}</Text>
            <Text c="dimmed">{r.typeLine}</Text>
          </Stack>

          {r.late && <Alert color="yellow" variant="light" icon={<Clock size={18} />}>{t('late_hint')}</Alert>}

          {active && strip && (
            <Stack gap="xs">
              <Text fw={600}>{t('strip_title')}</Text>
              {strip}
            </Stack>
          )}
          {active && r.pool && <PoolBox r={r} pool={r.pool} />}

          <Stack gap={8}>
            {r.comment && <DetailRow label={t('comment')}>{r.comment}</DetailRow>}
            <DetailRow label={t('submitted')}><DateText value={r.createdAt} withTime /></DetailRow>
            {r.decided && <DetailRow label={t(`decided_${r.status}`)}>{r.decided.by}, <DateText value={r.decided.at} withTime /></DetailRow>}
            {r.reason && <DetailRow label={t('reason')}>{t('my-leave:quoted', { text: r.reason })}</DetailRow>}
          </Stack>

          {active && (
            <>
              <Divider />
              <Group justify={onShowInCalendar ? 'space-between' : 'flex-end'}>
                {onShowInCalendar && (
                  <Button variant="subtle" leftSection={<ButtonIcon action="calendar" />} onClick={onShowInCalendar}>{t('show_in_calendar')}</Button>
                )}
                {r.status === 'pending' ? (
                  <Group gap="xs">
                    <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onReject}>{t('reject')}</Button>
                    <Button color="green" leftSection={<ButtonIcon action="confirm" />} onClick={onApprove}>{t('approve')}</Button>
                  </Group>
                ) : (
                  <Group gap="xs">
                    <Button variant="subtle" color="red" leftSection={<ButtonIcon action="cancel" />} onClick={onCancel}>{t('cancel_leave')}</Button>
                    <Button variant="default" leftSection={<ButtonIcon action="print" />} onClick={onPdf}>{t('pdf')}</Button>
                  </Group>
                )}
              </Group>
            </>
          )}
        </Stack>
      )}
    </SideDrawer>
  );
};
