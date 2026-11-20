import { useTranslation } from 'react-i18next';
import type { BoardPerson, TaskLeave } from '@app/shared';
import { PersonAvatar } from '../../../common/PersonAvatar';
import { leaveRange } from '../taskDue';

/** Kółko przypisanej osoby na karcie zadania; w dymku: w archiwum albo urlop przed terminem. */
export const AssigneeAvatar = ({ person, leave }: { person: BoardPerson; leave: TaskLeave | undefined }) => {
  const { t } = useTranslation('tasks');
  const tooltip = person.archived
    ? t('person_archived', { name: person.name })
    : leave
      ? t('person_on_leave', { name: person.name, ...leaveRange(leave.dateFrom, leave.dateTo) })
      : person.name;
  return <PersonAvatar name={person.name} archived={person.archived} onLeave={!!leave} tooltip={tooltip} />;
};
