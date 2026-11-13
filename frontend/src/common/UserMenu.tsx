import { Avatar, Group, Menu, Text, UnstyledButton } from '@mantine/core';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { initials } from '@app/shared';

/**
 * Menu użytkownika w górnej belce: kółko z inicjałami i imię (na telefonie same inicjały), a w nim „Moje konto”
 * (gdy ta osoba ma taką pozycję w menu) i „Wyloguj”. Ten sam wygląd w aplikacji i w makietach.
 */
export function UserMenu({ name, accountPath, onLogout }: {
  name: string;
  accountPath: string | null;
  onLogout(): void;
}) {
  const { t } = useTranslation();
  return (
    <Menu position="bottom-end" width={200} withinPortal>
      <Menu.Target>
        <UnstyledButton aria-label={t('user_menu')}>
          <Group gap="xs" wrap="nowrap">
            <Avatar radius="xl" size="md" variant="light">
              {initials(name)}
            </Avatar>
            <Text size="sm" fw={500} visibleFrom="sm" truncate maw={160}>
              {name}
            </Text>
            <ChevronDown size={14} aria-hidden />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {accountPath && (
          <Menu.Item component={Link} to={accountPath} leftSection={<UserRound size={16} aria-hidden />}>
            {t('nav.my_account')}
          </Menu.Item>
        )}
        <Menu.Item onClick={onLogout} leftSection={<LogOut size={16} aria-hidden />}>
          {t('logout')}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
