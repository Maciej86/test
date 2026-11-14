import { Alert, Button, PasswordInput, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { CircleAlert, Clock } from 'lucide-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { IDLE_LOGOUT_MS, loginSchema, ROLE_HOME, SERVER_MESSAGES, translateKey, type LoginInput, type SessionUser } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { apiErrorKey, apiErrorMessage } from '../../core/api/client';
import { useAuth } from '../../core/auth/AuthProvider';
import { notify } from '../../core/notify';
import { PASSWORD_CHANGE_PATH } from '../../config/constants';
import { AuthCard } from './components/AuthCard';
import { fieldError } from '../../core/fieldError';
import { useLogin } from './login.api';

/** Dokąd po zalogowaniu: najpierw własne hasło, jeśli administrator nadał tymczasowe. */
function homeOf(user: SessionUser): string {
  return user.mustChangePassword ? PASSWORD_CHANGE_PATH : ROLE_HOME[user.role];
}

/** Komunikat serwera, który ekran pokazuje w ramce nad polami (zły login lub hasło, za dużo prób). */
function loginProblem(error: unknown): string | null {
  const key = apiErrorKey(error);
  return key === SERVER_MESSAGES.loginFailed || key === SERVER_MESSAGES.tooManyLogins ? key : null;
}

export function LoginPage() {
  const { t } = useTranslation('login');
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useLogin();
  const form = useForm<LoginInput>({ initialValues: { login: '', password: '' }, validate: zod4Resolver(loginSchema) });

  if (user) return <Navigate to={homeOf(user)} replace />;

  const submit = form.onSubmit((values) => {
    login.mutate(loginSchema.parse(values), {
      onSuccess: async (loggedIn) => {
        await refresh();
        navigate(homeOf(loggedIn), { replace: true });
      },
      onError: (error) => {
        if (!loginProblem(error)) notify.error(apiErrorMessage(error, t));
      },
    });
  });

  const problem = login.isError ? loginProblem(login.error) : null;
  const reason = params.get('reason');

  return (
    <AuthCard>
      <Title order={1} fz="h2">{t('title')}</Title>
      {!problem && reason === 'idle' && (
        <Alert color="navy" icon={<Clock size={18} />}>{t('idle_logged_out', { minutes: IDLE_LOGOUT_MS / 60_000 })}</Alert>
      )}
      {!problem && reason === 'expired' && (
        <Alert color="navy" icon={<Clock size={18} />}>{t('session_expired')}</Alert>
      )}
      {problem && (
        <Alert color={problem === SERVER_MESSAGES.tooManyLogins ? 'yellow' : 'red'} icon={<CircleAlert size={18} />}>
          {translateKey(t, problem)}
        </Alert>
      )}
      <form onSubmit={submit} noValidate>
        <TextInput
          label={t('login')}
          description={t('login_hint')}
          placeholder="jan.kowalski@firma.pl"
          autoComplete="username"
          size="md"
          mb="md"
          {...form.getInputProps('login')}
          error={fieldError(t, form.errors.login)}
        />
        <PasswordInput
          label={t('password')}
          autoComplete="current-password"
          size="md"
          mb="md"
          {...form.getInputProps('password')}
          error={fieldError(t, form.errors.password)}
        />
        <Button type="submit" size="md" fullWidth leftSection={<ButtonIcon action="login" />} loading={login.isPending}>
          {t('submit')}
        </Button>
      </form>
      <Text size="sm" c="dimmed">{t('forgot')}</Text>
    </AuthCard>
  );
}
