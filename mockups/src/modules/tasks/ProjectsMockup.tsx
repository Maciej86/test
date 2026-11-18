import { useState } from 'react';
import { Anchor, Avatar, Button, Card, Group, Paper, SegmentedControl, Stack, Table, Text, Tooltip } from '@mantine/core';
import { FolderKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { DateText } from '../../common/DateText';
import { EmptyState } from '../../common/EmptyState';
import { OrderArrows } from '../../common/OrderArrows';
import { PageHeader } from '../../common/PageHeader';
import { Question, Questions } from '../../common/Question';
import { ArchiveProjectModal, ProjectModal } from './ProjectModals';
import { ARCHIVED_PEOPLE, PROJECTS, TASKS, type MockProject } from './data';

const STATES = ['list', 'new', 'duplicate', 'remove_member', 'archive', 'empty'] as const;
type State = (typeof STATES)[number];

const initials = (name: string) => name.split(' ').map((p) => p[0]).join('');

const counts = (p: MockProject) => {
  const tasks = TASKS.filter((task) => task.projectId === p.id);
  return { open: tasks.filter((task) => task.column !== 'done').length, done: tasks.filter((task) => task.column === 'done').length };
};

const Members = ({ p }: { p: MockProject }) => {
  const { t } = useTranslation('tasks');
  if (p.members.length === 0) return <Text size="sm" c="dimmed">{t('project_no_members')}</Text>;
  return (
    <Tooltip label={p.members.join(', ')} multiline w={260}>
      <Group gap="xs" wrap="nowrap">
        <Avatar.Group spacing={6}>
          {p.members.slice(0, 4).map((m) => (
            <Avatar key={m} size="sm" radius="xl" color={ARCHIVED_PEOPLE.includes(m) ? 'gray' : 'navy'} variant="light">{initials(m)}</Avatar>
          ))}
        </Avatar.Group>
        <Text size="sm" c="dimmed">{t('project_members_count', { count: p.members.length })}</Text>
      </Group>
    </Tooltip>
  );
};

const ProjectsQuestions = () => (
  <Questions>
    <Question
      number={12}
      about="Kolejność projektów"
      options={[
        { id: 'a', text: 'Strzałkami w tej tabeli, tak jak typy urlopów; ta sama kolejność w menu „Zadania”' },
        { id: 'b', text: 'Zawsze alfabetycznie' },
      ]}
      recommended="a"
    >
      W jakiej kolejności projekty mają być w menu?
    </Question>
    <Question
      number={13}
      about="Przycisk „Do archiwum”"
      options={[
        { id: 'a', text: 'Projekt znika z menu razem ze swoimi zadaniami i trafia do Archiwum; stamtąd można go przywrócić albo usunąć na stałe' },
        { id: 'b', text: 'Usunąć można tylko projekt bez zadań' },
      ]}
      recommended="a"
    >
      Co się dzieje z projektem, który już nie jest potrzebny?
    </Question>
    <Question
      number={14}
      about="Usunięcie osoby z projektu (stan „usuwam osobę z zadaniami”)"
      options={[
        { id: 'a', text: 'Osoba przestaje widzieć projekt i znika z przypisań w jego otwartych zadaniach (w zrealizowanych zostaje); okno najpierw ostrzega' },
        { id: 'b', text: 'Nie da się usunąć osoby, która ma otwarte zadania w projekcie' },
      ]}
      recommended="a"
    >
      Co z zadaniami osoby, którą usuwasz z projektu?
    </Question>
    <Question
      number={15}
      about="Powiadomienia o projektach"
      options={[
        { id: 'a', text: 'Pracownik dostaje powiadomienie w dzwonku, gdy dodasz go do projektu' },
        { id: 'b', text: 'Bez powiadomienia, projekt po prostu pojawia się w menu' },
      ]}
      recommended="a"
    >
      Czy pracownik ma dostać powiadomienie o dodaniu do projektu?
    </Question>
    <Question number={16} about="Okno projektu (zasady pól)">
      Nazwa: wymagana, 2–60 znaków, nie może się powtarzać (także z projektami w archiwum). Członkowie: 0–50 osób, tylko
      pracownicy spoza archiwum. Administratorzy widzą wszystkie projekty, więc nie trzeba ich dodawać. Odpowiedz „ok”
      albo popraw wybrane pola.
    </Question>
  </Questions>
);

export const ProjectsMockup = () => {
  const { t } = useTranslation('tasks');
  const [state, setState] = useState<State>('list');
  const [modal, setModal] = useState<{ project: MockProject | null; error?: boolean; remove?: string } | null>(null);
  const [archive, setArchive] = useState<MockProject | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setModal(null);
    setArchive(null);
    if (s === 'new') setModal({ project: null });
    if (s === 'duplicate') setModal({ project: null, error: true });
    if (s === 'remove_member') setModal({ project: PROJECTS[1]!, remove: 'Jan Kowalski' });
    if (s === 'archive') setArchive(PROJECTS[2]!);
  };

  const rows = state === 'empty' ? [] : PROJECTS;
  const add = <Button leftSection={<ButtonIcon action="add" />} onClick={() => setModal({ project: null })}>{t('project_new')}</Button>;

  const actions = (p: MockProject) => (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => setModal({ project: p })}>{t('edit')}</Button>
      <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="archive" size={14} />} onClick={() => setArchive(p)}>{t('project_archive')}</Button>
    </Group>
  );

  return (
    <Stack>
      <ProjectsQuestions />

      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => changeState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_project_states.${s}`) }))}
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <PageHeader title={t('projects_title')} subtitle={t('projects_subtitle')} actions={rows.length > 0 ? add : undefined} />

      {rows.length === 0 ? (
        <Paper withBorder>
          <EmptyState icon={FolderKanban} title={t('projects_empty_title')} text={t('projects_empty')} action={add} />
        </Paper>
      ) : (
        <>
          <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
            <Table verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={70}>{t('col_order')}</Table.Th>
                  <Table.Th>{t('col_project')}</Table.Th>
                  <Table.Th>{t('col_members')}</Table.Th>
                  <Table.Th>{t('col_tasks')}</Table.Th>
                  <Table.Th>{t('col_created')}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((p, i) => {
                  const c = counts(p);
                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td><OrderArrows index={i} count={rows.length} /></Table.Td>
                      <Table.Td><Anchor component={Link} to={`/admin/tasks/${p.id}`} fw={600}>{p.name}</Anchor></Table.Td>
                      <Table.Td><Members p={p} /></Table.Td>
                      <Table.Td>
                        <Text size="sm">{t('project_open', { count: c.open })}</Text>
                        <Text size="xs" c="dimmed">{t('project_done', { count: c.done })}</Text>
                      </Table.Td>
                      <Table.Td c="dimmed"><DateText value={p.createdAt} /></Table.Td>
                      <Table.Td>{actions(p)}</Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>

          <Stack gap="sm" hiddenFrom="sm">
            {rows.map((p, i) => {
              const c = counts(p);
              return (
                <Card key={p.id} withBorder padding="md">
                  <Stack gap="xs">
                    <Group justify="space-between" wrap="nowrap">
                      <Anchor component={Link} to={`/admin/tasks/${p.id}`} fw={600}>{p.name}</Anchor>
                      <OrderArrows index={i} count={rows.length} />
                    </Group>
                    <Members p={p} />
                    <Text size="sm" c="dimmed">{t('project_open', { count: c.open })}, {t('project_done', { count: c.done })}</Text>
                    {actions(p)}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </>
      )}

      {modal && <ProjectModal key={`${modal.project?.id ?? 'new'}-${modal.error}-${modal.remove}`} project={modal.project} showError={modal.error} removeMember={modal.remove} onClose={() => setModal(null)} />}
      {archive && <ArchiveProjectModal project={archive} onClose={() => setArchive(null)} />}
    </Stack>
  );
};
