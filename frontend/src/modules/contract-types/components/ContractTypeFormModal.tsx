import { useState, type ReactNode } from 'react';
import { Alert, Anchor, Button, Group, Modal, Stack, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CONTRACT_TYPE_MESSAGES, contractTypeSchema, type ContractTypeItem } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { apiErrorBody, apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useCreateContractType, useUnhideContractType, useUpdateContractType } from '../contract-types.api';

interface HiddenType {
  id: number;
  name: string;
}

/** Okno „Dodaj typ umowy” (contractType = null) i „Edytuj typ”. */
export const ContractTypeFormModal = ({ contractType, onClose }: { contractType: ContractTypeItem | null; onClose: () => void }) => {
  const { t } = useTranslation('contract-types');
  const isNew = contractType === null;
  const create = useCreateContractType();
  const update = useUpdateContractType();
  const unhide = useUnhideContractType();
  const [hiddenType, setHiddenType] = useState<HiddenType | null>(null);
  const form = useForm({
    initialValues: { name: contractType?.name ?? '' },
    validate: zod4Resolver(contractTypeSchema),
  });

  const submit = form.onSubmit((values) => {
    setHiddenType(null);
    const onError = (error: unknown) => {
      const fields = apiErrorFields(error);
      if (!fields) return notify.error(apiErrorMessage(error, t));
      form.setErrors(fields);
      setHiddenType((apiErrorBody(error)?.hiddenType as HiddenType | undefined) ?? null);
    };
    if (isNew) {
      create.mutate(values, { onSuccess: () => { notify.success(t('added')); onClose(); }, onError });
    } else {
      update.mutate({ id: contractType.id, ...values }, { onSuccess: () => { notify.success(t('saved')); onClose(); }, onError });
    }
  });

  const restoreHidden = () => {
    if (!hiddenType) return;
    unhide.mutate(hiddenType.id, {
      onSuccess: () => { notify.success(t('unhidden_done')); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  };

  /** Nazwa zajęta przez ukryty typ: tekst z nazwą i link „Przywróć go”. */
  const nameError = (): ReactNode => {
    if (hiddenType && form.errors.name === CONTRACT_TYPE_MESSAGES.nameTakenHidden) {
      return (
        <>
          {t('name_taken_hidden', { name: hiddenType.name })}{' '}
          <Anchor component="button" type="button" size="xs" c="red.3" td="underline" onClick={restoreHidden}>
            {t('name_taken_restore')}
          </Anchor>
        </>
      );
    }
    return fieldError(t, form.errors.name);
  };

  return (
    <Modal opened onClose={onClose} title={isNew ? t('add') : t('edit_title', { name: contractType.name })}>
      <form onSubmit={submit} noValidate>
        <Stack>
          {!isNew && contractType.employeesCount > 0 && (
            <Alert color="yellow" icon={<CircleAlert size={18} />}>
              {t('used_warning', { count: contractType.employeesCount })}
            </Alert>
          )}
          <TextInput
            label={t('field_name')}
            withAsterisk
            description={t('field_name_hint')}
            autoComplete="off"
            data-autofocus
            {...form.getInputProps('name')}
            error={nameError()}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action="save" />} loading={create.isPending || update.isPending}>
              {t('save')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};
