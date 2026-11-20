import { Alert, Button, PasswordInput, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { ShieldCheck } from 'lucide-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { myAccountPasswordSchema, type MyAccountPasswordInput } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { InfoCard } from '../../../common/InfoCard';
import { apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useChangeMyPassword } from '../my-account.api';

const EMPTY: MyAccountPasswordInput = { currentPassword: '', newPassword: '', repeatPassword: '' };

/** Zmiana własnego hasła z obecnym; po zmianie pola są puste, a osoba zostaje zalogowana na tym urządzeniu. */
export const PasswordCard = ({ login }: { login: string }) => {
  const { t } = useTranslation('my-account');
  const change = useChangeMyPassword();
  const form = useForm<MyAccountPasswordInput>({ initialValues: EMPTY, validate: zod4Resolver(myAccountPasswordSchema) });

  const submit = form.onSubmit((values) => {
    change.mutate(values, {
      onSuccess: () => {
        notify.success(t('password_saved'));
        form.reset();
      },
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) form.setErrors(fields);
        else notify.error(apiErrorMessage(error, t));
      },
    });
  });

  const field = (name: keyof MyAccountPasswordInput) => ({
    ...form.getInputProps(name),
    error: fieldError(t, form.errors[name]),
    withAsterisk: true,
  });

  return (
    <form onSubmit={submit} noValidate>
      {/* Menedżer haseł zapisze nowe hasło przy właściwym koncie. */}
      <input type="text" name="username" autoComplete="username" value={login} readOnly hidden />
      <InfoCard
        title={t('password')}
        actions={<Button type="submit" leftSection={<ButtonIcon action="password" />} loading={change.isPending}>{t('change_password')}</Button>}
      >
        <PasswordInput label={t('current_password')} autoComplete="current-password" {...field('currentPassword')} />
        <PasswordInput label={t('new_password')} description={t('new_password_hint')} autoComplete="new-password" {...field('newPassword')} />
        <PasswordInput label={t('repeat_password')} autoComplete="new-password" {...field('repeatPassword')} />
        <Alert variant="light" color="gray" icon={<ShieldCheck size={18} />} p="xs">
          <Text size="xs">{t('other_devices_hint')}</Text>
        </Alert>
      </InfoCard>
    </form>
  );
};
