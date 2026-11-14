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
      <PasswordInput label={t('new_password')} description={t('new_password_hint')} defaultValue="Urlop-2026" size="md" />
      <PasswordInput label={t('repeat_password')} defaultValue="Urlop-2025" error={t('passwords_differ')} size="md" />
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
