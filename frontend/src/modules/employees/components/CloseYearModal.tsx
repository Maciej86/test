import { useState } from 'react';
import { Alert, Button, Group, Modal, NumberInput, Stack, Table, Text } from '@mantine/core';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ANNUAL_DAYS_MAX, TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DataState } from '../../../common/DataState';
import { apiErrorMessage } from '../../../core/api/client';
import { notify } from '../../../core/notify';
import { useCloseYear, useCloseYearPreview } from '../employees.api';

/** „Zamknij rok”: podgląd z pulą na nowy rok do zmiany i sumą „Razem” liczoną na bieżąco. */
export const CloseYearModal = ({ opened, onClose }: { opened: boolean; onClose: () => void }) => {
  const { t } = useTranslation('employees');
  const preview = useCloseYearPreview(opened);
  const closeYear = useCloseYear();
  const [annuals, setAnnuals] = useState<Record<number, number>>({});
  const data = preview.data;
  const annualOf = (userId: number, fallback: number) => annuals[userId] ?? fallback;

  const confirm = () => {
    if (!data) return;
    closeYear.mutate(
      { year: data.year, pools: data.rows.map((r) => ({ userId: r.userId, annualDays: annualOf(r.userId, r.annualDays) })) },
      {
        onSuccess: () => { notify.success(t('close_done', { year: data.year, next: data.nextYear })); onClose(); },
        onError: (error) => { notify.error(apiErrorMessage(error, t)); onClose(); },
      },
    );
  };

  return (
    <Modal opened={opened} onClose={onClose} title={data ? t('close_year', { year: data.year }) : ''} size="xl">
      <DataState query={preview}>
        {data && (
          <Stack>
            <Text size="sm">{t('close_year_intro', { year: data.year, next: data.nextYear })}</Text>
            {data.pendingRequests > 0 && (
              <Alert color="yellow" icon={<CircleAlert size={18} />}>
                {t('close_year_pending', { count: data.pendingRequests, next: data.nextYear })}
              </Alert>
            )}
            {data.rows.length === 0 ? (
              <Text c="dimmed">{t('close_year_empty', { year: data.year })}</Text>
            ) : (
              <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
                <Table verticalSpacing="xs">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>{t('col_name')}</Table.Th>
                      <Table.Th ta="right">{t('close_col_left', { year: data.year })}</Table.Th>
                      <Table.Th w={150}>{t('close_col_annual', { year: data.nextYear })}</Table.Th>
                      <Table.Th ta="right">{t('close_col_total', { year: data.nextYear })}</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.rows.map((r) => {
                      const annual = annualOf(r.userId, r.annualDays);
                      return (
                        <Table.Tr key={r.userId}>
                          <Table.Td fw={500}>{r.name}</Table.Td>
                          <Table.Td ta="right">{r.left}</Table.Td>
                          <Table.Td>
                            <NumberInput
                              size="xs"
                              value={annual}
                              onChange={(v) => setAnnuals((a) => ({ ...a, [r.userId]: Math.min(ANNUAL_DAYS_MAX, Math.max(0, Number(v) || 0)) }))}
                              min={0}
                              max={ANNUAL_DAYS_MAX}
                              allowDecimal={false}
                              allowNegative={false}
                              aria-label={t('close_col_annual', { year: data.nextYear })}
                            />
                          </Table.Td>
                          <Table.Td ta="right" fw={700}>{r.left + annual}</Table.Td>
                        </Table.Tr>
                      );
                    })}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
            <Group justify="flex-end">
              <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
              <Button leftSection={<ButtonIcon action="close_year" />} loading={closeYear.isPending} disabled={!data.canClose || data.rows.length === 0} onClick={confirm}>
                {t('close_confirm', { year: data.year })}
              </Button>
            </Group>
          </Stack>
        )}
      </DataState>
    </Modal>
  );
};
