import { Center, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export function NoAccess() {
  const { t } = useTranslation('server');
  return (
    <Center p="xl">
      <Text c="red">{t('no_access')}</Text>
    </Center>
  );
}
