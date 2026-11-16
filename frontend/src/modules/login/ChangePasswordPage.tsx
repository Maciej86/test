import { Button, Text, Title, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router';
import { newPasswordSchema, ROLE_HOME, type NewPasswordInput } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { IdleWarningModal } from '../../common/IdleWarningModal';
import { apiErrorFields, apiErrorMessage } from '../../core/api/client';
import { useAuth } from '../../core/auth/AuthProvider';
import { notify } from '../../core/notify';
import { AuthCard } from './components/AuthCard';
import { fieldError } from '../../core/fieldError';
import { useChangePassword } from './login.api';

/** Własne hasło zamiast tymczasowego od administratora; bez tego aplikacja nie pokaże żadnego innego ekranu. */
export const ChangePasswordPage = () => {
  const { t } = useTranslation('login');
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const change = useChangePassword();
  const form = useForm<NewPasswordInput>({
    initialValues: { newPassword: '', repeatPassword: '' },
    validate: zod4Resolver(newPasswordSchema),
  });

  if (!user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to={ROLE_HOME[user.role]} replace />;

  const submit = form.onSubmit((values) => {
    change.mutate(values, {
      onSuccess: async (updated) => {
        notify.success(t('password_saved'));
        await refresh();
        navigate(ROLE_HOME[updated.role], { replace: true });
      },
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) form.setErrors(fields);
        else notify.error(apiErrorMessage(error, t));
      },
    });
  });

  return (
    <AuthCard>
      <Title order={1} fz="h2">{t('new_password_title')}</Title>
      <Text size="sm" c="dimmed">{t('new_password_intro')}</Text>
      <form onSubmit={submit} noValidate>
        <PasswordInput
          label={t('new_password')}
          description={t('new_password_hint')}
          autoComplete="new-password"
          size="md"
          mb="md"
          {...form.getInputProps('newPassword')}
          error={fieldError(t, form.errors.newPassword)}
        />
        <PasswordInput
          label={t('repeat_password')}
          autoComplete="new-password"
          size="md"
          mb="md"
          {...form.getInputProps('repeatPassword')}
          error={fieldError(t, form.errors.repeatPassword)}
        />
        <Button type="submit" size="md" fullWidth leftSection={<ButtonIcon action="save" />} loading={change.isPending}>
          {t('new_password_submit')}
        </Button>
      </form>
      <Button variant="subtle" color="gray" leftSection={<ButtonIcon action="logout" />} onClick={() => void logout()}>
        {t('logout')}
      </Button>
      <IdleWarningModal />
    </AuthCard>
  );
};
