import { Avatar, Indicator, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { initials, type BoardPerson, type TaskLeave } from '@app/shared';
import { leaveRange } from '../taskDue';

/** Kółko z inicjałami przypisanej osoby: żółta kropka = urlop przed terminem, szare = konto w archiwum. */
export const PersonAvatar = ({ person, leave }: { person: BoardPerson; leave: TaskLeave | undefined }) => {
  const { t } = useTranslation('tasks');
  const label = person.archived
    ? t('person_archived', { name: person.name })
    : leave
      ? t('person_on_leave', { name: person.name, ...leaveRange(leave.dateFrom, leave.dateTo) })
      : person.name;
  return (
    <Tooltip label={label} withArrow>
      <Indicator color="yellow.5" size={9} offset={3} position="top-end" disabled={!leave} withBorder>
        <Avatar
          size="sm"
          radius="xl"
          color={person.archived ? 'gray' : 'navy'}
          variant={person.archived ? 'outline' : 'light'}
          opacity={person.archived ? 0.6 : 1}
          aria-label={label}
        >
          {initials(person.name)}
        </Avatar>
      </Indicator>
    </Tooltip>
  );
};
