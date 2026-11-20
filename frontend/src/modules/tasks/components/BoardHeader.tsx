import type { ReactNode } from 'react';
import { Avatar, Button, Tooltip } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import type { BoardPerson } from '@app/shared';
import { ButtonIcon } from '../../../common/ButtonIcon';
import { PageHeader } from '../../../common/PageHeader';
import { MorePeopleAvatar, PersonAvatar } from '../../../common/PersonAvatar';

const MAX_AVATARS = 4;

/** Nagłówek tablicy: nazwa projektu, liczby, kto widzi projekt, przyciski (edycja projektu tylko dla administratora). */
export const BoardHeader = ({ name, empty, openCount, overdue, people, extraActions, onAdd }: {
  name: string;
  /** Na tablicy nie ma żadnej karty. */
  empty: boolean;
  openCount: number;
  overdue: number;
  people: BoardPerson[];
  extraActions?: ReactNode;
  onAdd: () => void;
}) => {
  const { t } = useTranslation('tasks');
  const viewers = people.filter((p) => p.assignable);
  const subtitle =
    empty
      ? t('summary_empty')
      : [t('summary', { count: openCount }), overdue > 0 ? t('summary_overdue', { count: overdue }) : null].filter(Boolean).join(', ');
  return (
    <PageHeader
      title={name}
      subtitle={subtitle}
      actions={
        <>
          {viewers.length > 0 && (
            <Tooltip label={t('project_people', { names: viewers.map((p) => p.name).join(', ') })} multiline w={280}>
              <Avatar.Group spacing={6}>
                {viewers.slice(0, MAX_AVATARS).map((p) => (
                  <PersonAvatar key={p.id} name={p.name} archived={p.archived} />
                ))}
                {viewers.length > MAX_AVATARS && <MorePeopleAvatar label={t('more_people', { count: viewers.length - MAX_AVATARS })} />}
              </Avatar.Group>
            </Tooltip>
          )}
          {extraActions}
          <Button leftSection={<ButtonIcon action="add" />} onClick={onAdd}>{t('new_task')}</Button>
        </>
      }
    />
  );
};
