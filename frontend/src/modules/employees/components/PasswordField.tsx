import { useState } from 'react';
import { Button, Group, PasswordInput } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { generateTemporaryPassword } from '../../../core/password';

/** Pole „Hasło tymczasowe” z przyciskiem „Wygeneruj”; wygenerowane hasło widać od razu, żeby je przekazać. */
export const PasswordField = ({ value, error, onChange }: { value: string; error?: string; onChange: (value: string) => void }) => {
  const { t } = useTranslation('employees');
  const [visible, setVisible] = useState(false);
  return (
    <Group align="flex-end" gap="xs" wrap="nowrap">
      <PasswordInput
        label={t('password')}
        withAsterisk
        description={t('password_hint')}
        autoComplete="new-password"
        value={value}
        error={error}
        onChange={(e) => onChange(e.currentTarget.value)}
        visible={visible}
        onVisibilityChange={setVisible}
        style={{ flex: 1 }}
      />
      <Button
        variant="default"
        leftSection={<ButtonIcon action="refresh" />}
        mb={error ? 22 : 0}
        onClick={() => {
          onChange(generateTemporaryPassword());
          setVisible(true);
        }}
      >
        {t('generate')}
      </Button>
    </Group>
  );
};
