import { useState, type ReactNode } from 'react';
import { Anchor, Button, Divider, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, TextInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useTranslation } from 'react-i18next';
import {
  ANNUAL_DAYS_DEFAULT,
  ANNUAL_DAYS_MAX,
  CARRIED_DAYS_MAX,
  EMPLOYEE_MESSAGES,
  ROLE_LABELS,
  ROLES,
  employeeCreateSchema,
  employeeUpdateSchema,
  translateKey,
  type ArchivedUserHint,
  type EmployeeCreateInput,
  type EmployeeListItem,
} from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { DateField } from '../../../common/DateField';
import { apiErrorBody, apiErrorFields, apiErrorMessage } from '../../../core/api/client';
import { fieldError } from '../../../core/fieldError';
import { notify } from '../../../core/notify';
import { useContractTypeOptions, useCreateEmployee, useRestoreEmployee, useUpdateEmployee } from '../employees.api';
import { PasswordField } from './PasswordField';

type FormValues = Omit<EmployeeCreateInput, 'email' | 'hiredOn' | 'contractTypeId'> & {
  email: string;
  hiredOn: string | null;
  /** Select trzyma numer typu jako tekst. */
  contractTypeId: string | null;
};

const initialValues = (employee: EmployeeListItem | null): FormValues => {
  return {
    firstName: employee?.firstName ?? '',
    lastName: employee?.lastName ?? '',
    login: employee?.login ?? '',
    email: employee?.email ?? '',
    role: employee?.role ?? 'employee',
    hiredOn: employee?.hiredOn ?? null,
    contractTypeId: employee?.contractType ? String(employee.contractType.id) : null,
    password: '',
    annualDays: employee?.pool?.annualDays ?? ANNUAL_DAYS_DEFAULT,
    carriedDays: employee?.pool?.carriedDays ?? 0,
  };
};

/** Okno „Dodaj pracownika” (employee = null) i „Edytuj”. Pula na rok otwarty tylko przy roli Pracownik. */
export const EmployeeFormModal = ({ opened, employee, year, onClose }: {
  opened: boolean;
  employee: EmployeeListItem | null;
  year: number;
  onClose: () => void;
}) => {
  const { t } = useTranslation('employees');
  const isNew = employee === null;
  const create = useCreateEmployee();
  const update = useUpdateEmployee();
  const restore = useRestoreEmployee();
  const [archived, setArchived] = useState<ArchivedUserHint | null>(null);
  const [confirmRestore, setConfirmRestore] = useState(false);
  const form = useForm<FormValues>({
    initialValues: initialValues(employee),
    validate: zod4Resolver(isNew ? employeeCreateSchema : employeeUpdateSchema),
  });

  const contractTypes = useContractTypeOptions();
  // Ukryty typ, który osoba już ma, zostaje do wyboru tylko u niej, na końcu listy. Tuż po ukryciu lista typów może
  // jeszcze go mieć (przed odświeżeniem): wtedy nie dopisujemy go drugi raz, bo Select nie przyjmuje powtórzeń.
  const visibleOptions = (contractTypes.data ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  const ownHiddenType = employee?.contractType?.hidden ? employee.contractType : null;
  const ownHidden = ownHiddenType && !visibleOptions.some((o) => o.value === String(ownHiddenType.id)) ? ownHiddenType : null;
  const contractOptions = [
    ...visibleOptions,
    ...(ownHidden ? [{ value: String(ownHidden.id), label: `${ownHidden.name} ${t('hidden_suffix')}` }] : []),
  ];

  const submit = form.onSubmit((formValues) => {
    setArchived(null);
    const values = { ...formValues, contractTypeId: formValues.contractTypeId ? Number(formValues.contractTypeId) : null };
    const onError = (error: unknown) => {
      const fields = apiErrorFields(error);
      if (!fields) return notify.error(apiErrorMessage(error, t));
      form.setErrors(fields);
      setArchived((apiErrorBody(error)?.archivedUser as ArchivedUserHint | undefined) ?? null);
    };
    if (isNew) {
      create.mutate(values, { onSuccess: () => { notify.success(t('added')); onClose(); }, onError });
    } else {
      const { password: _unused, ...data } = values;
      update.mutate({ id: employee.id, ...data }, { onSuccess: () => { notify.success(t('saved')); onClose(); }, onError });
    }
  });

  const doRestore = () => {
    if (!archived) return;
    restore.mutate(archived.id, {
      onSuccess: () => { notify.success(t('restored', { name: archived.name })); onClose(); },
      onError: (error) => notify.error(apiErrorMessage(error, t)),
    });
  };

  /** Błąd pola; przy koncie w archiwum z linkiem „Przywróć konto zamiast zakładać nowe”. */
  const errorOf = (field: 'login' | 'email'): ReactNode => {
    const key = form.errors[field];
    const archivedKey = field === 'login' ? EMPLOYEE_MESSAGES.loginTakenArchived : EMPLOYEE_MESSAGES.emailTakenArchived;
    if (isNew && archived && key === archivedKey) {
      return (
        <>
          {t(`${field}_taken_archived`, { name: archived.name })}{' '}
          <Anchor component="button" type="button" size="xs" c="red.3" td="underline" onClick={() => setConfirmRestore(true)}>
            {t('login_restore')}
          </Anchor>
        </>
      );
    }
    // W „Edytuj” przywracanie innego konta nie ma sensu: sam tekst z imieniem, bez linku.
    if (archived && key === archivedKey) return t(`${field}_taken_archived`, { name: archived.name });
    return fieldError(t, key);
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isNew ? t('add') : t('edit_title', { name: employee.name })} size="lg">
      <form onSubmit={submit} noValidate>
        <Stack>
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput
              label={t('first_name')}
              withAsterisk
              autoComplete="off"
              {...form.getInputProps('firstName')}
              error={fieldError(t, form.errors.firstName)}
            />
            <TextInput
              label={t('last_name')}
              withAsterisk
              autoComplete="off"
              {...form.getInputProps('lastName')}
              error={fieldError(t, form.errors.lastName)}
            />
          </SimpleGrid>
          <TextInput
            label={t('login')}
            withAsterisk
            description={t('login_hint')}
            autoComplete="off"
            {...form.getInputProps('login')}
            error={errorOf('login')}
          />
          <TextInput label={t('notify_email')} description={t('notify_hint')} {...form.getInputProps('email')} error={errorOf('email')} />
          <Select
            label={t('col_role')}
            withAsterisk
            data={ROLES.map((r) => ({ value: r, label: translateKey(t, ROLE_LABELS[r]) }))}
            allowDeselect={false}
            disabled={employee?.isMe}
            description={employee?.isMe ? t('role_self') : undefined}
            {...form.getInputProps('role')}
            error={fieldError(t, form.errors.role)}
          />
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <DateField
              label={t('hired_on')}
              value={form.values.hiredOn}
              onChange={(v) => form.setFieldValue('hiredOn', v)}
              error={fieldError(t, form.errors.hiredOn)}
            />
            <Select
              label={t('contract_type')}
              data={contractOptions}
              clearable
              clearButtonProps={{ 'aria-label': t('contract_type_clear') }}
              nothingFoundMessage={t('contract_types_empty')}
              {...form.getInputProps('contractTypeId')}
              error={fieldError(t, form.errors.contractTypeId) ?? (contractTypes.isError ? t('contract_types_error') : undefined)}
            />
          </SimpleGrid>
          {isNew && (
            <PasswordField
              value={form.values.password}
              error={fieldError(t, form.errors.password)}
              onChange={(v) => form.setFieldValue('password', v)}
            />
          )}

          {form.values.role === 'employee' && (
            <>
              <Divider label={t('pool_section', { year })} labelPosition="left" mt="xs" />
              <Text size="xs" c="dimmed" mt={-8}>{t('pool_section_hint')}</Text>
              <SimpleGrid cols={{ base: 1, xs: 2 }}>
                <NumberInput
                  label={t('annual')}
                  withAsterisk
                  description={t('days_hint', { max: ANNUAL_DAYS_MAX })}
                  min={0}
                  max={ANNUAL_DAYS_MAX}
                  allowDecimal={false}
                  allowNegative={false}
                  {...form.getInputProps('annualDays')}
                  error={fieldError(t, form.errors.annualDays)}
                />
                <NumberInput
                  label={t('carried', { year: year - 1 })}
                  description={t('days_hint', { max: CARRIED_DAYS_MAX })}
                  min={0}
                  max={CARRIED_DAYS_MAX}
                  allowDecimal={false}
                  allowNegative={false}
                  {...form.getInputProps('carriedDays')}
                  error={fieldError(t, form.errors.carriedDays)}
                />
              </SimpleGrid>
            </>
          )}

          <Group justify="flex-end" mt="sm">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
            <Button type="submit" leftSection={<ButtonIcon action="save" />} loading={create.isPending || update.isPending}>
              {t('save')}
            </Button>
          </Group>
        </Stack>
      </form>

      <Modal opened={confirmRestore} onClose={() => setConfirmRestore(false)} title={t('restore_title', { name: archived?.name })} size="sm">
        <Stack>
          <Text size="sm">{t('restore_text')}</Text>
          <Group justify="flex-end">
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => setConfirmRestore(false)}>
              {t('cancel')}
            </Button>
            <Button leftSection={<ButtonIcon action="restore" />} loading={restore.isPending} onClick={doRestore}>
              {t('restore_confirm')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Modal>
  );
};
