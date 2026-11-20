import { useState } from 'react';
import { Alert, Button, Grid, Group, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { DetailRow } from '../../common/DetailRow';
import { RoleBadge } from '../../common/RoleBadge';
import { InfoCard } from '../../common/InfoCard';
import { PageHeader } from '../../common/PageHeader';
import { useMockupRole } from '../../common/mockupRole';
import { notify } from '../../common/notify';
import { ACCOUNTS, type MockAccount } from './data';

const STATES = ['normal', 'errors'] as const;
type State = (typeof STATES)[number];

/** Dane, których osoba sama nie zmienia: kto to jest i jak się loguje. */
const ProfileCard = ({ account }: { account: MockAccount }) => {
  const { t } = useTranslation('my-account');
  const { t: tCommon } = useTranslation();
  return (
    <InfoCard title={t('data')}>
      <Stack gap={10}>
        <Text ff="heading" fw={600} fz="xl">{account.name}</Text>
        <DetailRow label={t('login')}>{account.login}</DetailRow>
        <DetailRow label={t('role')}>
          <RoleBadge role={account.role} />
        </DetailRow>
        <DetailRow label={t('hired_on')}><DateText value={account.hiredOn} /></DetailRow>
        <DetailRow label={t('contract_type')}>{account.contractType ?? <Text span size="sm" c="dimmed">{tCommon('empty_value')}</Text>}</DetailRow>
      </Stack>
      <Text size="xs" c="dimmed" mt="xs">{t(account.role === 'admin' ? 'readonly_hint_admin' : 'readonly_hint')}</Text>
    </InfoCard>
  );
};

const EmailCard = ({ account, state }: { account: MockAccount; state: State }) => {
  const { t } = useTranslation('my-account');
  return (
    <InfoCard
      title={t('notify_email')}
      actions={<Button leftSection={<ButtonIcon action="save" />} onClick={() => notify.success(t('email_saved'))}>{t('save_email')}</Button>}
    >
      <Text size="sm" c="dimmed">{t(account.role === 'admin' ? 'notify_intro_admin' : 'notify_intro_employee')}</Text>
      <TextInput
        key={state}
        label={t('email_address')}
        description={t('notify_hint')}
        defaultValue={state === 'errors' ? 'marta.wisniewska@firma.pl' : account.notifyEmail}
        error={state === 'errors' ? t('validation:email_taken') : undefined}
        autoComplete="email"
        inputMode="email"
      />
    </InfoCard>
  );
};

const PasswordCard = ({ state }: { state: State }) => {
  const { t } = useTranslation('my-account');
  const errors = state === 'errors';
  return (
    <InfoCard
      title={t('password')}
      actions={<Button leftSection={<ButtonIcon action="password" />} onClick={() => notify.success(t('password_saved'))}>{t('change_password')}</Button>}
    >
      <PasswordInput key={`current-${state}`} label={t('current_password')} autoComplete="current-password" defaultValue={errors ? 'stare-haslo' : ''} error={errors ? t('server.current_wrong') : undefined} withAsterisk />
      <PasswordInput key={`new-${state}`} label={t('new_password')} description={t('new_password_hint')} autoComplete="new-password" defaultValue={errors ? 'Urlop2026!' : ''} withAsterisk />
      <PasswordInput key={`repeat-${state}`} label={t('repeat_password')} autoComplete="new-password" defaultValue={errors ? 'Urlop2025!' : ''} error={errors ? t('validation:passwords_differ') : undefined} withAsterisk />
      <Alert variant="light" color="gray" icon={<ShieldCheck size={18} />} p="xs">
        <Text size="xs">{t('other_devices_hint')}</Text>
      </Alert>
    </InfoCard>
  );
};

export const MyAccountMockup = () => {
  const { t } = useTranslation('my-account');
  const role = useMockupRole();
  const [state, setState] = useState<State>('normal');
  const account = ACCOUNTS[role === 'admin' ? 'admin' : 'employee'];

  return (
    <Stack>
      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => setState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
          />
        </Group>
      </Paper>

      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, md: 5 }}>
          <ProfileCard account={account} />
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 7 }}>
          <Stack gap="md">
            <EmailCard account={account} state={state} />
            <PasswordCard state={state} />
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
};
