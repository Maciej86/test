import { Avatar, Indicator, Tooltip } from '@mantine/core';
import { initials } from '@app/shared';

/**
 * Kółko z inicjałami osoby: granatowe; konto w archiwum szare, obrysowane i przygaszone; `onLeave` = żółta kropka
 * (urlop). `tooltip` = dymek po najechaniu (i opis dla czytnika ekranu); bez niego opisem jest imię.
 */
export const PersonAvatar = ({ name, archived = false, onLeave = false, tooltip }: {
  name: string;
  archived?: boolean;
  onLeave?: boolean;
  tooltip?: string;
}) => {
  const avatar = (
    <Indicator color="yellow.5" size={9} offset={3} position="top-end" disabled={!onLeave} withBorder>
      <Avatar
        size="sm"
        radius="xl"
        color={archived ? 'gray' : 'navy'}
        variant={archived ? 'outline' : 'light'}
        opacity={archived ? 0.6 : 1}
        aria-label={tooltip ?? name}
      >
        {initials(name)}
      </Avatar>
    </Indicator>
  );
  return tooltip ? <Tooltip label={tooltip} withArrow>{avatar}</Tooltip> : avatar;
};

/** Szare kółko „+N” na końcu grupy kółek, gdy osób jest więcej, niż się mieści. */
export const MorePeopleAvatar = ({ label }: { label: string }) => (
  <Avatar size="sm" radius="xl" color="gray">{label}</Avatar>
);
