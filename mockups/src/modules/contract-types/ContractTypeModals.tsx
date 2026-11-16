import { Alert, Anchor, Button, Group, Modal, Stack, Text, TextInput } from '@mantine/core';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../common/ButtonIcon';
import { notify } from '../../common/notify';
import { TAKEN_HIDDEN_NAME, TAKEN_NAME, type MockContractType } from './data';

/** Dodawanie (contractType = null) i edycja typu. `nameTaken` pokazuje błąd nazwy zajętej przez ukryty typ. */
export const ContractTypeModal = ({ contractType, nameTaken = false, onClose }: {
  contractType: MockContractType | null;
  nameTaken?: boolean;
  onClose: () => void;
}) => {
  const { t } = useTranslation('contract-types');
  const isNew = contractType === null;

  const save = () => {
    notify.success(isNew ? t('added') : t('saved'));
    onClose();
  };

  return (
    <Modal opened onClose={onClose} title={isNew ? t('add') : t('edit_title', { name: contractType.name })}>
      <Stack>
        {!isNew && contractType.employees > 0 && (
          <Alert color="yellow" icon={<CircleAlert size={18} />}>
            {t('used_warning', { count: contractType.employees })}
          </Alert>
        )}
        <TextInput
          label={t('field_name')}
          withAsterisk
          description={t('field_name_hint')}
          defaultValue={contractType?.name ?? (nameTaken ? TAKEN_NAME : '')}
          error={nameTaken && (
            <>
              {t('name_taken_hidden', { name: TAKEN_HIDDEN_NAME })}{' '}
              <Anchor size="xs" component="button" type="button" c="red.3" td="underline">{t('name_taken_restore')}</Anchor>
            </>
          )}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="save" />} onClick={save}>{t('save')}</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export const HideModal = ({ contractType, onClose }: { contractType: MockContractType | null; onClose: () => void }) => {
  const { t } = useTranslation('contract-types');
  return (
    <Modal opened={contractType !== null} onClose={onClose} title={t('hide_title', { name: contractType?.name })}>
      <Stack>
        <Text>{t('hide_text', { count: contractType?.employees ?? 0 })}</Text>
        <Group justify="flex-end">
          <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={onClose}>{t('cancel')}</Button>
          <Button leftSection={<ButtonIcon action="hide" />} onClick={() => { notify.success(t('hidden_done')); onClose(); }}>
            {t('hide')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
