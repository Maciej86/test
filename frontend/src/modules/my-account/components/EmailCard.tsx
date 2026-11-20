import { Button, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import { myAccountEmailSchema, type MyAccount } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { InfoCard } from '../../../common/InfoCard';
import { apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useSaveMyEmail } from '../my-account.api';

/** E-mail do powiadomień; puste pole = brak e-maili. */
export const EmailCard = ({ account }: { account: MyAccount }) => {
  const { t } = useTranslation('my-account');
  const save = useSaveMyEmail();
  const form = useForm<{ email: string }>({
    initialValues: { email: account.email ?? '' },
    validate: zod4Resolver(myAccountEmailSchema),
  });

  const submit = form.onSubmit(() => {
    const { email } = myAccountEmailSchema.parse(form.values);
    save.mutate({ email }, {
      onSuccess: () => notify.success(t('email_saved')),
      onError: (error) => {
        const fields = apiErrorFields(error);
        if (fields) form.setErrors(fields);
        else notify.error(apiErrorMessage(error, t));
      },
    });
  });

  return (
    <form onSubmit={submit} noValidate>
      <InfoCard
        title={t('notify_email')}
        actions={<Button type="submit" leftSection={<ButtonIcon action="save" />} loading={save.isPending}>{t('save_email')}</Button>}
      >
        <Stack gap="xs">
          <Text size="sm" c="dimmed">{t(account.role === 'admin' ? 'notify_intro_admin' : 'notify_intro_employee')}</Text>
          <TextInput
            label={t('email_address')}
            description={t('notify_hint')}
            autoComplete="email"
            inputMode="email"
            {...form.getInputProps('email')}
            error={fieldError(t, form.errors.email)}
          />
        </Stack>
      </InfoCard>
    </form>
  );
};
