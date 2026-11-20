import { Grid, Stack } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { DataState } from '../../common/DataState';
import { PageHeader } from '../../common/PageHeader';
import { EmailCard } from './components/EmailCard';
import { PasswordCard } from './components/PasswordCard';
import { ProfileCard } from './components/ProfileCard';
import { useMyAccount } from './my-account.api';

/** Moje konto: własne dane (odczyt), e-mail do powiadomień i zmiana hasła; każda zalogowana osoba. */
export const MyAccountPage = () => {
  const { t } = useTranslation('my-account');
  const account = useMyAccount();
  const data = account.data;
  return (
    <Stack>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      <DataState query={account}>
        {data && (
          <Grid gap="md" align="flex-start">
            <Grid.Col span={{ base: 12, md: 5 }}>
              <ProfileCard account={data} />
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 7 }}>
              <Stack gap="md">
                <EmailCard account={data} />
                <PasswordCard />
              </Stack>
            </Grid.Col>
          </Grid>
        )}
      </DataState>
    </Stack>
  );
};
