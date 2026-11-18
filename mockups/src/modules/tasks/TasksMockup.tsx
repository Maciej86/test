import { useRef, useState, type DragEvent } from 'react';
import { Avatar, Badge, Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Switch, Text, TextInput, Title, Tooltip } from '@mantine/core';
import { Search, SquareKanban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MOCK_USER_NAMES } from '../../common/mockUsers';
import { ButtonIcon } from '../../common/ButtonIcon';
import { EmptyState } from '../../common/EmptyState';
import { notify } from '../../common/notify';
import { PageHeader } from '../../common/PageHeader';
import { Question, Questions } from '../../common/Question';
import { useMockupRole } from '../../common/mockupRole';
import { TaskCard } from './TaskCard';
import { ProjectModal } from './ProjectModals';
import { ArchiveTaskModal, TaskCreateModal, TaskDrawer } from './TaskModals';
import { ADMINS, ARCHIVED_PEOPLE, COLUMNS, TASKS, TODAY, dueState, isOldDone, leaveBeforeDue, projectById, type Column, type MockTask } from './data';

const STATES = ['board', 'new', 'edit', 'edit_leave', 'errors', 'archive', 'old_done', 'only_mine', 'empty'] as const;
type State = (typeof STATES)[number];

/** Przenosi zadanie `id` do kolumny `column`, przed zadanie `beforeId` (null = na koniec kolumny). */
const moveTask = (tasks: MockTask[], id: number, column: Column, beforeId: number | null): MockTask[] => {
  const moving = tasks.find((x) => x.id === id);
  if (!moving) return tasks;
  const completedAt = column === 'done' ? (moving.column === 'done' ? moving.completedAt : `${TODAY} 12:00`) : undefined;
  const moved = { ...moving, column, completedAt };
  const rest = tasks.filter((x) => x.id !== id);
  const index = beforeId === null ? -1 : rest.findIndex((x) => x.id === beforeId);
  if (index === -1) {
    const lastInColumn = rest.map((x) => x.column).lastIndexOf(column);
    rest.splice(lastInColumn + 1, 0, moved);
  } else {
    rest.splice(index, 0, moved);
  }
  return rest;
};

const TasksQuestions = () => (
  <Questions>
    <Question
      number={1}
      about="Karta zadania"
      options={[
        { id: 'a', text: 'Kliknięcie karty otwiera podgląd z prawej, w którym od razu można zmieniać pola i klikać „Zapisz”; pod spodem komentarze' },
        { id: 'b', text: 'Najpierw sam podgląd, zmiany dopiero po kliknięciu „Edytuj”' },
      ]}
      recommended="a"
    >
      Co ma się dziać po kliknięciu karty? (Dodawanie jest teraz w oknie na środku, jak prosiłeś.)
    </Question>
    <Question
      number={2}
      about="Przycisk „Dodaj zadanie”"
      options={[
        { id: 'a', text: 'Jeden przycisk u góry; nowe zadanie trafia na górę „W opracowaniu” (w oknie można wybrać inną kolumnę)' },
        { id: 'b', text: 'Dodatkowo mały przycisk „+” pod każdą kolumną' },
      ]}
      recommended="a"
    >
      Gdzie dodaje się zadania?
    </Question>
    <Question
      number={3}
      about="Żółta kropka przy osobie (powiązanie z urlopami)"
      options={[
        { id: 'a', text: 'Kropka, gdy osoba ma zatwierdzony urlop między dziś a terminem zadania (bez terminu: w najbliższych 14 dniach); po najechaniu same daty, bez rodzaju urlopu; w formularzu żółta ramka' },
        { id: 'b', text: 'Tak samo, ale także dla wniosków czekających na decyzję' },
        { id: 'c', text: 'Bez informacji o urlopach na tablicy' },
      ]}
      recommended="a"
    >
      Czy tablica ma pokazywać, że przypisana osoba będzie na urlopie przed terminem?
    </Question>
    <Question
      number={4}
      about="Przełącznik „Tylko moje zadania”"
      options={[
        { id: 'a', text: 'Zadania, do których jestem przypisany (moje karty mają też niebieski pasek po lewej)' },
        { id: 'b', text: 'Przypisane do mnie i te, które sam dodałem' },
      ]}
      recommended="a"
    >
      Które zadania są „moje”?
    </Question>
    <Question
      number={5}
      about="Powiadomienia o zadaniach"
      options={[
        { id: 'a', text: 'Gdy ktoś inny przypisze mnie do zadania albo skomentuje zadanie, do którego jestem przypisany' },
        { id: 'b', text: 'Dodatkowo, gdy ktoś inny przeniesie moje zadanie do „Zrealizowane” albo je usunie' },
      ]}
      recommended="a"
    >
      Kiedy osoba dostaje powiadomienie w dzwonku?
    </Question>
    <Question
      number={6}
      about="Tablica na telefonie"
      options={[
        { id: 'a', text: 'Jedna kolumna naraz, przełączana u góry; kolejność przeciągnięciem, do innej kolumny przez „⋮ → Przenieś do”' },
        { id: 'b', text: 'Wszystkie trzy kolumny jedna pod drugą' },
      ]}
      recommended="a"
    >
      Jak tablica ma wyglądać na telefonie? (Zmniejsz okno przeglądarki, żeby zobaczyć wariant a.)
    </Question>
    <Question
      number={8}
      about="Przeciąganie kart"
      options={[
        { id: 'a', text: 'Zgoda na dodatek „@dnd-kit” (darmowy, popularny, działa też palcem na telefonie)' },
        { id: 'b', text: 'Bez dodatku: przenoszenie tylko z menu karty' },
      ]}
      recommended="a"
    >
      Do przeciągania kart (także na telefonie) potrzebny jest dodatek spoza ustalonej listy. Zgadzasz się?
    </Question>
    <Question number={9} about="Formularz zadania i komentarz (zasady pól)">
      Tytuł: wymagany, 3–150 znaków. Opis: nieobowiązkowy, do 2000 znaków. Termin: nieobowiązkowy, data DD.MM.RRRR
      (np. 25.11.2026); przy dodawaniu nie wcześniejszy niż dziś, przy zmianie dowolny. Przypisane osoby: 0–10, tylko
      członkowie projektu i administratorzy, bez kont w archiwum. Kolumna: domyślnie „W opracowaniu”. Komentarz: 1–2000
      znaków. Odpowiedz „ok” albo popraw wybrane pola.
    </Question>
    <Question
      number={10}
      about="Menu „Zadania”"
      options={[
        { id: 'a', text: 'Każdy projekt osobno; „moje zadania ze wszystkich projektów” pokaże Pulpit' },
        { id: 'b', text: 'Dodatkowo pozycja „Moje zadania” na górze podmenu: moje zadania ze wszystkich projektów na jednej tablicy' },
      ]}
      recommended="a"
    >
      Czy potrzebny jest widok zadań ze wszystkich projektów naraz?
    </Question>
    <Question
      number={11}
      about="Komentarze (w podglądzie zadania „Edycja”)"
      options={[
        { id: 'a', text: 'Autor może poprawić i usunąć swój komentarz (poprawiony ma dopisek „edytowany”); administrator może usunąć każdy' },
        { id: 'b', text: 'Komentarzy nie da się zmieniać ani usuwać' },
      ]}
      recommended="a"
    >
      Kto może zmieniać i usuwać komentarze?
    </Question>
  </Questions>
);

export const TasksMockup = ({ projectId }: { projectId: number }) => {
  const { t } = useTranslation('tasks');
  const role = useMockupRole();
  const me = MOCK_USER_NAMES[role] ?? '';
  const isAdmin = role === 'admin';
  const project = projectById(projectId);
  const projectTasks = TASKS.filter((task) => task.projectId === projectId);
  const [state, setState] = useState<State>('board');
  const [tasks, setTasks] = useState<MockTask[]>(projectTasks);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [search, setSearch] = useState('');
  const [phoneColumn, setPhoneColumn] = useState<Column>('in_progress');
  const [create, setCreate] = useState<{ errors: boolean } | null>(null);
  const [details, setDetails] = useState<MockTask | null>(null);
  const [archive, setArchive] = useState<MockTask | null>(null);
  const [editProject, setEditProject] = useState(false);
  const [dropColumn, setDropColumn] = useState<Column | null>(null);
  const dragged = useRef<number | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setCreate(null);
    setDetails(null);
    setArchive(null);
    setOnlyMine(s === 'only_mine');
    setShowOld(s === 'old_done');
    setSearch('');
    setTasks(s === 'empty' ? [] : projectTasks);
    const withComments = projectTasks.find((task) => (task.comments?.length ?? 0) > 1) ?? projectTasks[0];
    const withLeave = projectTasks.find((task) => task.people.some((p) => leaveBeforeDue(task, p))) ?? withComments;
    if (s === 'new') setCreate({ errors: false });
    if (s === 'errors') setCreate({ errors: true });
    if (s === 'edit' && withComments) setDetails(withComments);
    if (s === 'edit_leave' && withLeave) setDetails(withLeave);
    if (s === 'archive' && projectTasks[0]) setArchive(projectTasks[0]);
    if (s === 'old_done') setPhoneColumn('done');
  };

  const query = search.trim().toLowerCase();
  const visible = tasks.filter(
    (task) =>
      (!onlyMine || task.people.includes(me)) &&
      (showOld || !isOldDone(task)) &&
      (query === '' || task.title.toLowerCase().includes(query) || (task.description ?? '').toLowerCase().includes(query)),
  );
  const filtered = onlyMine || query !== '';
  const open = tasks.filter((task) => task.column !== 'done');
  const overdue = open.filter((task) => dueState(task) === 'overdue').length;
  const oldCount = tasks.filter((task) => isOldDone(task) && (!onlyMine || task.people.includes(me))).length;

  const move = (task: MockTask, column: Column) => {
    setTasks((all) => moveTask(all, task.id, column, null));
    notify.success(t('moved', { column: t(`column.${column}`) }));
  };

  const onCardDragOver = (target: MockTask) => (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const id = dragged.current;
    setDropColumn(target.column);
    if (id === null || id === target.id) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const below = e.clientY > rect.top + rect.height / 2;
    setTasks((all) => {
      const inColumn = all.filter((x) => x.column === target.column && x.id !== id);
      const next = inColumn[inColumn.findIndex((x) => x.id === target.id) + 1];
      const beforeId = below ? (next?.id ?? null) : target.id;
      const current = all.find((x) => x.id === id);
      const currentInColumn = all.filter((x) => x.column === target.column);
      const currentNext = currentInColumn[currentInColumn.findIndex((x) => x.id === id) + 1];
      if (current?.column === target.column && (currentNext?.id ?? null) === beforeId) return all;
      return moveTask(all, id, target.column, beforeId);
    });
  };

  const onColumnDragOver = (column: Column) => (e: DragEvent) => {
    e.preventDefault();
    setDropColumn(column);
    const id = dragged.current;
    if (id === null) return;
    setTasks((all) => (all.find((x) => x.id === id)?.column === column ? all : moveTask(all, id, column, null)));
  };

  const endDrag = () => {
    dragged.current = null;
    setDropColumn(null);
  };

  const renderColumn = (column: Column, phone = false) => {
    const items = visible.filter((task) => task.column === column);
    const total = tasks.filter((task) => task.column === column && (showOld || !isOldDone(task))).length;
    return (
      <Paper
        key={column}
        p="sm"
        withBorder
        bg="var(--app-panel-background)"
        onDragOver={onColumnDragOver(column)}
        onDrop={endDrag}
        style={{
          outline: dropColumn === column ? '2px dashed var(--mantine-color-navy-4)' : undefined,
          outlineOffset: -2,
          minHeight: 160,
        }}
      >
        {!phone && (
          <Group justify="space-between" mb="sm" wrap="nowrap">
            <Title order={3} size="h4">{t(`column.${column}`)}</Title>
            <Badge variant="light" color="gray" tt="none">{filtered ? `${items.length} / ${total}` : total}</Badge>
          </Group>
        )}
        <Stack gap="sm">
          {items.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              mine={task.people.includes(me)}
              onOpen={() => setDetails(task)}
              onMove={(c) => move(task, c)}
              onArchive={() => setArchive(task)}
              onDragStart={(e) => { dragged.current = task.id; e.dataTransfer.effectAllowed = 'move'; }}
              onDragOver={onCardDragOver(task)}
            />
          ))}
          {items.length === 0 && tasks.length > 0 && (
            <Text size="sm" c="dimmed" ta="center" py="lg">{filtered ? t('column_empty_filtered') : t('column_empty')}</Text>
          )}
          {column === 'done' && oldCount > 0 && (
            <Stack gap={2} align="center" mt="xs">
              <Button variant="subtle" size="xs" onClick={() => setShowOld((v) => !v)}>
                {showOld ? t('hide_old_done') : t('show_old_done', { count: oldCount })}
              </Button>
              {!showOld && <Text size="xs" c="dimmed">{t('old_done_hint')}</Text>}
            </Stack>
          )}
        </Stack>
      </Paper>
    );
  };

  const members = [...ADMINS, ...project.members];

  return (
    <Stack onDragEnd={endDrag}>
      <TasksQuestions />

      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('mockup_state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => changeState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`mockup_states.${s}`) }))}
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <PageHeader
        title={project.name}
        subtitle={
          tasks.length === 0
            ? t('summary_empty')
            : [t('summary', { count: open.length }), overdue > 0 ? t('summary_overdue', { count: overdue }) : null].filter(Boolean).join(', ')
        }
        actions={
          <>
            <Tooltip label={t('project_people', { names: members.join(', ') })} multiline w={280}>
              <Avatar.Group spacing={6}>
                {members.slice(0, 4).map((p) => (
                  <Avatar key={p} size="sm" radius="xl" color={ARCHIVED_PEOPLE.includes(p) ? 'gray' : 'navy'} variant="light">
                    {p.split(' ').map((x) => x[0]).join('')}
                  </Avatar>
                ))}
                {members.length > 4 && <Avatar size="sm" radius="xl" color="gray">+{members.length - 4}</Avatar>}
              </Avatar.Group>
            </Tooltip>
            {isAdmin && (
              <Button variant="default" leftSection={<ButtonIcon action="edit" />} onClick={() => setEditProject(true)}>{t('project_edit')}</Button>
            )}
            <Button leftSection={<ButtonIcon action="add" />} onClick={() => setCreate({ errors: false })}>{t('new_task')}</Button>
          </>
        }
      />

      <Group gap="md" align="center">
        <TextInput
          placeholder={t('search')}
          aria-label={t('search')}
          leftSection={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={{ base: '100%', sm: 260 }}
        />
        <Switch label={t('only_mine')} checked={onlyMine} onChange={(e) => setOnlyMine(e.currentTarget.checked)} />
      </Group>

      {tasks.length === 0 ? (
        <Paper withBorder>
          <EmptyState
            icon={SquareKanban}
            title={t('board_empty_title')}
            text={t('board_empty', { project: project.name })}
            action={<Button leftSection={<ButtonIcon action="add" />} onClick={() => setCreate({ errors: false })}>{t('new_task')}</Button>}
          />
        </Paper>
      ) : (
        <>
          <SimpleGrid cols={3} spacing="md" visibleFrom="md" style={{ alignItems: 'start' }}>
            {COLUMNS.map((c) => renderColumn(c))}
          </SimpleGrid>

          {/* Telefon: jedna kolumna naraz. */}
          <Stack hiddenFrom="md" gap="sm">
            <SegmentedControl
              fullWidth
              value={phoneColumn}
              onChange={(v) => setPhoneColumn(v as Column)}
              data={COLUMNS.map((c) => ({
                value: c,
                label: `${t(`column.${c}`)} (${visible.filter((task) => task.column === c).length})`,
              }))}
            />
            {renderColumn(phoneColumn, true)}
          </Stack>

          <Text size="sm" c="dimmed" visibleFrom="md">{t('drag_hint')}</Text>
        </>
      )}

      {create && <TaskCreateModal key={String(create.errors)} project={project} showErrors={create.errors} onClose={() => setCreate(null)} />}
      {details && (
        <TaskDrawer
          key={details.id}
          project={project}
          task={details}
          me={me}
          isAdmin={isAdmin}
          onClose={() => setDetails(null)}
          onArchive={(task) => { setDetails(null); setArchive(task); }}
        />
      )}
      {archive && <ArchiveTaskModal task={archive} onClose={() => setArchive(null)} />}
      {editProject && <ProjectModal project={project} onClose={() => setEditProject(false)} />}
    </Stack>
  );
};
