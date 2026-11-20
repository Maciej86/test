import { useState, type ReactNode } from 'react';
import { Alert, Badge, Button, Grid, Group, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput } from '@mantine/core';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROLE_LABELS, translateKey } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { InfoCard } from '../../common/InfoCard';
import { PageHeader } from '../../common/PageHeader';
import { Question, Questions } from '../../common/Question';
import { useMockupRole } from '../../common/mockupRole';
import { notify } from '../../common/notify';
import { ACCOUNTS, type MockAccount } from './data';

const STATES = ['normal', 'errors'] as const;
type State = (typeof STATES)[number];

/** Wiersz kartoteki: przygaszona etykieta po lewej, wartość po prawej (na telefonie pod spodem). */
const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <Group gap="md" align="baseline" wrap="wrap" style={{ rowGap: 2 }}>
    <Text size="sm" c="dimmed" w={150} style={{ flex: 'none' }}>{label}</Text>
    <Text size="sm" component="div" style={{ flex: 1, minWidth: 180, overflowWrap: 'anywhere' }}>{children}</Text>
  </Group>
);

/** Dane, których osoba sama nie zmienia: kto to jest i jak się loguje. */
const ProfileCard = ({ account }: { account: MockAccount }) => {
  const { t } = useTranslation('my-account');
  const { t: tCommon } = useTranslation();
  return (
    <InfoCard title={t('data')}>
      <Stack gap={10}>
        <Text ff="heading" fw={600} fz="xl">{account.name}</Text>
        <Row label={t('login')}>{account.login}</Row>
        <Row label={t('role')}>
          <Badge variant="light" color={account.role === 'admin' ? 'navy' : 'gray'}>{translateKey(tCommon, ROLE_LABELS[account.role])}</Badge>
        </Row>
        <Row label={t('hired_on')}><DateText value={account.hiredOn} /></Row>
        <Row label={t('contract_type')}>{account.contractType ?? <Text span size="sm" c="dimmed">{tCommon('empty_value')}</Text>}</Row>
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
        error={state === 'errors' ? t('email_taken') : undefined}
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
      <PasswordInput key={`current-${state}`} label={t('current_password')} autoComplete="current-password" defaultValue={errors ? 'stare-haslo' : ''} error={errors ? t('current_wrong') : undefined} withAsterisk />
      <PasswordInput key={`new-${state}`} label={t('new_password')} description={t('new_password_hint')} autoComplete="new-password" defaultValue={errors ? 'Urlop2026!' : ''} withAsterisk />
      <PasswordInput key={`repeat-${state}`} label={t('repeat_password')} autoComplete="new-password" defaultValue={errors ? 'Urlop2025!' : ''} error={errors ? t('repeat_mismatch') : undefined} withAsterisk />
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
      <Questions>
        <Question
          number={1}
          about={t('notify_email')}
          options={[
            { id: 'a', text: 'Tylko administrator widzi to pole (dziś tylko on dostaje e-maile); e-mail pracownika zmienia administrator w Pracownikach' },
            { id: 'b', text: 'Obie role widzą to pole, a pracownik czyta, że na razie aplikacja nie wysyła mu e-maili' },
          ]}
          recommended="b"
        >
          Czy pracownik ma widzieć pole „E-mail do powiadomień”? Dziś aplikacja wysyła e-maile tylko administratorom
          (o nowym wniosku). Przełącz „Oglądam jako”, żeby zobaczyć obie wersje.
        </Question>
        <Question
          number={2}
          about={t('password')}
          options={[
            { id: 'a', text: 'Trzeba podać obecne hasło (ktoś przy cudzym, niezablokowanym komputerze nie zmieni hasła)' },
            { id: 'b', text: 'Wystarczy nowe hasło dwa razy' },
          ]}
          recommended="a"
        >
          Czy do zmiany hasła trzeba wpisać obecne hasło?
        </Question>
        <Question
          number={3}
          about={t('password')}
          options={[
            { id: 'a', text: 'Na tym urządzeniu zostajesz zalogowany, na innych (np. telefon) trzeba zalogować się nowym hasłem' },
            { id: 'b', text: 'Wylogowanie wszędzie, także tutaj; od razu logujesz się nowym hasłem' },
          ]}
          recommended="a"
        >
          Co się dzieje po zmianie hasła?
        </Question>
        <Question
          number={4}
          about="Historia zmian"
          options={[
            { id: 'a', text: 'Tak: „Jan Kowalski zmienił swoje hasło” / „…zmienił swój e-mail do powiadomień” (bez samego hasła)' },
            { id: 'b', text: 'Nie, to prywatne ustawienia osoby' },
          ]}
          recommended="a"
        >
          Czy zmiana własnego hasła i e-maila ma trafiać do Historii zmian (widzi ją administrator)?
        </Question>
        <Question number={5} about="Zasady pól">
          Zasady pól. Odpowiedz „ok” albo popraw pojedyncze pola:
          <br />
            • E-mail do powiadomień: nieobowiązkowy; prawdziwy adres, np. jan.kowalski@firma.pl; do 254 znaków; nie
            może być taki sam jak u innej osoby (też w archiwum).<br />
            • Obecne hasło: wymagane; musi się zgadzać.<br />
            • Nowe hasło: wymagane; 8–72 znaki, w tym cyfra i znak specjalny (te same zasady co przy pierwszym
            logowaniu); inne niż obecne.<br />
            • Powtórz nowe hasło: wymagane; takie samo jak nowe.
        </Question>
      </Questions>

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
