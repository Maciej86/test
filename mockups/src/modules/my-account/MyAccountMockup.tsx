import { Button, PasswordInput, SimpleGrid, Stack, Text, TextInput, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '../../common/InfoCard';
import { useMockupRole } from '../../common/mockupRole';

export function MyAccountMockup() {
  const { t } = useTranslation('my-account');
  const role = useMockupRole();
  const person = role === 'admin'
    ? { name: 'Anna Nowak', login: 'anna.nowak@firma.pl', email: 'anna.nowak@firma.pl' }
    : { name: 'Jan Kowalski', login: 'jan.kowalski@firma.pl', email: '' };
  return (
    <Stack>
      <Title order={2}>{t('title')}</Title>
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        <InfoCard title={t('data')} actions={<Button>{t('save')}</Button>}>
          <TextInput label={t('name')} value={person.name} readOnly />
          <TextInput label={t('login')} value={person.login} readOnly />
          <Text size="xs" c="dimmed">{t('readonly_hint')}</Text>
          <TextInput label={t('notify_email')} defaultValue={person.email} description={t('notify_hint')} />
        </InfoCard>
        <InfoCard title={t('password')} actions={<Button>{t('change_password')}</Button>}>
          <PasswordInput label={t('current_password')} />
          <PasswordInput label={t('new_password')} />
          <PasswordInput label={t('repeat_password')} />
        </InfoCard>
      </SimpleGrid>
    </Stack>
  );
}
