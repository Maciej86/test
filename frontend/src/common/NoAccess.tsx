// rule-ok: tylko w aplikacji, ekran braku uprawnień przy trasach
import { Center, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';

export const NoAccess = () => {
  const { t } = useTranslation('server');
  return (
    <Center p="xl">
      <Text c="red">{t('no_access')}</Text>
    </Center>
  );
};
