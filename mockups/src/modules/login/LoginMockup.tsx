import { useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Group,
  Paper,
  PasswordInput,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { CircleAlert, Clock, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { Question, Questions } from '../../common/Question';
import { idleMinutes, today, typedLogin, warningSeconds } from './data';

const STATES = ['normal', 'failed', 'too_many', 'idle', 'new_password', 'idle_warning'] as const;
type State = (typeof STATES)[number];

/** Kartka z kalendarza: dzisiejsza data dużym szeryfowym krojem, jak nagłówek pisma kadrowego. */
function CalendarSheet() {
  const { t } = useTranslation('login');
  return (
    <Stack gap={0} pl="xl" style={{ borderLeft: '3px solid var(--mantine-color-navy-4)' }}>
      <Text size="lg" c="dimmed">{today.weekday}</Text>
      <Title order={1} fz={144} lh={1} fw={600}>{today.day}</Title>
      <Title order={2} fz={30} fw={500}>{today.monthYear}</Title>
      <Text mt="xl" fw={600} size="lg">{t('common:app_name')}</Text>
      <Text c="dimmed" maw={320}>{t('intro')}</Text>
    </Stack>
  );
}

/** Wąski nagłówek nad formularzem na telefonie (zamiast kartki z kalendarza). */
function PhoneHeader() {
  const { t } = useTranslation('login');
  return (
    <Stack gap={2} hiddenFrom="md" mb="lg">
      <Title order={2}>{t('common:app_name')}</Title>
      <Text c="dimmed" size="sm">{today.full}</Text>
    </Stack>
  );
}

function FormCard({ children }: { children: ReactNode }) {
  return (
    <Paper withBorder p="xl" bg="dark.6" w="100%" maw={420}>
      <Stack gap="md">{children}</Stack>
    </Paper>
  );
}

function LoginForm({ state }: { state: State }) {
  const { t } = useTranslation('login');
  const filled = state !== 'normal' && state !== 'idle';
  return (
    <FormCard>
      <Title order={2}>{t('title')}</Title>
      {state === 'idle' && (
        <Alert color="navy" icon={<Clock size={18} />}>{t('idle_logged_out', { minutes: idleMinutes })}</Alert>
      )}
      {state === 'failed' && (
        <Alert color="red" icon={<CircleAlert size={18} />}>{t('server:login_failed')}</Alert>
      )}
      {state === 'too_many' && (
        <Alert color="yellow" icon={<CircleAlert size={18} />}>{t('server:too_many_logins')}</Alert>
      )}
      <TextInput
        label={t('login')}
        description={t('login_hint')}
        placeholder="jan.kowalski@firma.pl"
        defaultValue={filled ? typedLogin : ''}
        autoComplete="username"
        size="md"
      />
      <PasswordInput label={t('password')} defaultValue={filled ? 'haslo1234' : ''} autoComplete="current-password" size="md" />
      <Button size="md" fullWidth leftSection={<ButtonIcon action="login" />} disabled={state === 'too_many'}>
        {t('submit')}
      </Button>
      <Text size="sm" c="dimmed">{t('forgot')}</Text>
    </FormCard>
  );
}

function NewPasswordForm() {
  const { t } = useTranslation('login');
  return (
    <FormCard>
      <Title order={2}>{t('new_password_title')}</Title>
      <Text size="sm" c="dimmed">{t('new_password_intro')}</Text>
      <PasswordInput label={t('new_password')} description={t('new_password_hint')} defaultValue="Urlop2026" size="md" />
      <PasswordInput label={t('repeat_password')} defaultValue="Urlop2025" error={t('passwords_differ')} size="md" />
      <Button size="md" fullWidth leftSection={<ButtonIcon action="save" />}>{t('new_password_submit')}</Button>
    </FormCard>
  );
}

/** Okno ostrzeżenia w panelu, pokazane tu bez przyciemnienia ekranu, żeby dało się wrócić do innych stanów. */
function IdleWarning() {
  const { t } = useTranslation('login');
  return (
    <Stack align="center" gap="sm" w="100%">
      <Paper withBorder p="lg" bg="dark.6" w="100%" maw={440}>
        <Stack gap="md">
          <Group gap="xs" wrap="nowrap">
            <Clock size={20} aria-hidden />
            <Title order={3}>{t('idle_warning_title')}</Title>
          </Group>
          <Text>{t('idle_warning_text', { minutes: idleMinutes - 1, seconds: warningSeconds })}</Text>
          <Group justify="flex-end">
            <Button variant="default" leftSection={<ButtonIcon action="logout" />}>{t('idle_logout')}</Button>
            <Button leftSection={<ButtonIcon action="confirm" />}>{t('idle_stay')}</Button>
          </Group>
        </Stack>
      </Paper>
      <Group gap={6} c="dimmed">
        <Info size={14} aria-hidden />
        <Text size="xs">{t('idle_behind')}</Text>
      </Group>
    </Stack>
  );
}

export function LoginMockup() {
  const { t } = useTranslation('login');
  const [state, setState] = useState<State>('normal');

  return (
    <Stack>
      <Questions>
        <Question
          number={1}
          about="Wylogowanie po bezczynności"
          options={[
            { id: 'a', text: 'Po 30 minutach bez żadnej czynności' },
            { id: 'b', text: 'Po 15 minutach' },
            { id: 'c', text: 'Po 60 minutach' },
          ]}
          recommended="a"
        >
          Po jakim czasie bez klikania i pisania aplikacja ma wylogować osobę?
        </Question>
        <Question
          number={2}
          about="Ostrzeżenie w panelu"
          options={[
            { id: 'a', text: 'Minutę wcześniej okno „Zaraz Cię wylogujemy” z przyciskiem „Zostań zalogowany”' },
            { id: 'b', text: 'Bez ostrzeżenia: po czasie od razu ekran logowania z komunikatem' },
          ]}
          recommended="a"
        >
          Czy ostrzegać przed wylogowaniem? (Stan „Ostrzeżenie w panelu”). Niezapisany formularz przepadnie przy
          wylogowaniu, więc ostrzeżenie chroni przed utratą pisanego wniosku.
        </Question>
        <Question
          number={3}
          about="Hasło tymczasowe"
          options={[
            { id: 'a', text: 'Po pierwszym zalogowaniu trzeba od razu ustawić własne hasło (stan „Hasło tymczasowe”)' },
            { id: 'b', text: 'Hasłem od administratora można logować się dalej; zmiana tylko w „Moim koncie”' },
          ]}
          recommended="a"
        >
          Administrator zakłada konto albo ustawia nowe hasło, gdy ktoś zapomni swojego. Co dalej z tym hasłem?
        </Question>
        <Question
          number={4}
          about="Formularz logowania"
          options={[
            { id: 'a', text: 'Bez „Zapamiętaj mnie”: po bezczynności i po zamknięciu przeglądarki trzeba się zalogować' },
            { id: 'b', text: 'Z polem „Zapamiętaj mnie” (bez wylogowania po bezczynności dla tej osoby)' },
          ]}
          recommended="a"
        >
          Czy dodać pole „Zapamiętaj mnie”? Kłóci się z wylogowaniem po bezczynności, dlatego polecam bez niego.
        </Question>
        <Question number={5} about="Zasady pól">
          Propozycja (odpowiedz „ok” albo popraw pojedyncze pola): Login: wymagany, 3–190 znaków, bez spacji, wielkość
          liter bez znaczenia (np. jan.kowalski@firma.pl). Hasło przy logowaniu: wymagane. Nowe hasło: wymagane, 8–72
          znaki, dowolne znaki. Powtórz hasło: takie samo jak nowe.
        </Question>
        <Question number={6} about="Limit prób">
          Po 10 nieudanych próbach z jednego komputera logowanie blokuje się na 15 minut (stan „Za dużo prób”), żeby
          nikt nie zgadywał haseł. Udane logowania się nie liczą. Czy tak zostawić? (polecam „tak”)
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
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <Box bg="dark.8" py={{ base: 'lg', md: 64 }} px={{ base: 'md', md: 'xl' }} mih={560}>
        {state === 'idle_warning' ? (
          <IdleWarning />
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} maw={960} mx="auto" style={{ alignItems: 'center' }}>
            <Box visibleFrom="md">
              <CalendarSheet />
            </Box>
            <Box>
              <PhoneHeader />
              {state === 'new_password' ? <NewPasswordForm /> : <LoginForm state={state} />}
            </Box>
          </SimpleGrid>
        )}
      </Box>
    </Stack>
  );
}
