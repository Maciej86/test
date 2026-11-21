// rule-ok: tylko w aplikacji, stan zapytania do API (makiety nie pobierają danych)
import type { ReactNode } from 'react';
import { Alert, Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { apiErrorMessage } from '../core/api/client';
import { ButtonIcon } from './ButtonIcon';
import { EmptyState } from './EmptyState';

interface QueryLike {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
}

/**
 * Każdy ekran z danymi z serwera: kręciołek przy ładowaniu, błąd z przyciskiem „Spróbuj ponownie”,
 * pusta lista z tekstem i akcją (np. „Dodaj pierwszego klienta”), a dopiero potem treść.
 *
 *   const clients = useClients(params);
 *   <DataState query={clients} isEmpty={clients.data?.items.length === 0} emptyText={t('list.empty')}
 *              emptyAction={<AddClientButton />}>
 *     <ClientsTable data={clients.data!} />
 *   </DataState>
 */
export const DataState = ({
  query,
  isEmpty = false,
  emptyText,
  emptyAction,
  children,
}: {
  query: QueryLike;
  isEmpty?: boolean;
  emptyText?: string;
  emptyAction?: ReactNode;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  if (query.isPending) {
    return (
      <Center py="xl">
        <Loader aria-label={t('loading')} />
      </Center>
    );
  }
  if (query.isError) {
    return (
      <Alert color="red" title={t('load_error')}>
        <Stack gap="sm" align="flex-start">
          <Text size="sm">{apiErrorMessage(query.error, t)}</Text>
          <Button variant="default" leftSection={<ButtonIcon action="refresh" />} onClick={() => query.refetch()}>
            {t('retry')}
          </Button>
        </Stack>
      </Alert>
    );
  }
  if (isEmpty) {
    return <EmptyState text={emptyText ?? t('empty_list')} action={emptyAction} />;
  }
  return <>{children}</>;
};
