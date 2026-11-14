import { useState } from 'react';
import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { Search, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { Question, Questions } from '../../common/Question';
import { ArchiveModal, CloseYearModal, EmployeeModal, PasswordModal } from './EmployeeModals';
import { PoolLegend, PoolMeter } from './PoolMeter';
import { EMPLOYEES, POOL_YEAR, type MockEmployee } from './data';

const STATES = ['list', 'empty', 'no_results', 'login_taken'] as const;
type State = (typeof STATES)[number];

function EmployeeQuestions() {
  return (
    <Questions>
      <Question
        number={1}
        about="Kolumna „Urlop w 2026”"
        options={[
          { id: 'a', text: 'Dni odejmują tylko zatwierdzone wnioski; dni z wniosków czekających są w dopisku pod paskiem' },
          { id: 'b', text: 'Wnioski czekające też od razu zmniejszają „zostało”' },
        ]}
        recommended="a"
      >
        Jak liczyć, ile dni zostało pracownikowi? (Wnioski zbuduje moduł „Moje urlopy”; tu tylko pokazujemy ich wynik.)
      </Question>
      <Question
        number={2}
        about="Zamknij rok"
        options={[
          { id: 'a', text: 'Wszystkie niewykorzystane dni, także stare zaległe, przechodzą do zaległych na nowy rok' },
          { id: 'b', text: 'Przechodzą tylko dni z puli rocznej; niewykorzystane stare zaległe przepadają' },
        ]}
        recommended="a"
      >
        Co przechodzi na nowy rok przy „Zamknij rok”?
      </Question>
      <Question
        number={3}
        about="Zamknij rok"
        options={[
          { id: 'a', text: 'W oknie przy każdej osobie podpowiedź: pula taka jak w zamykanym roku, do zmiany' },
          { id: 'b', text: 'Jedna liczba dla wszystkich, wpisana raz' },
        ]}
        recommended="a"
      >
        Skąd pula dni na nowy rok?
      </Question>
      <Question
        number={4}
        about="Zamknij rok"
        options={[
          { id: 'a', text: 'Bez cofania: przed zatwierdzeniem okno z podglądem, potem pojedyncze poprawki w „Edytuj”' },
          { id: 'b', text: 'Przycisk „Cofnij zamknięcie roku”, dopóki nikt nie złożył wniosku na nowy rok' },
        ]}
        recommended="a"
      >
        Czy zamknięcie roku da się cofnąć? Przycisk działa w dowolnym dniu (np. już w grudniu); aplikacja sama roku nie
        zamyka.
      </Question>
      <Question
        number={5}
        about="Hasło"
        options={[
          { id: 'a', text: 'Wpisujesz hasło sam albo klikasz „Wygeneruj”' },
          { id: 'b', text: 'Tylko „Wygeneruj”, bez wpisywania' },
        ]}
        recommended="a"
      >
        Jak powstaje hasło przy dodawaniu i przy „Ustaw hasło”? W obu przypadkach jest tymczasowe: przy logowaniu
        pracownik ustawia własne (ustalone w Logowaniu).
      </Question>
      <Question
        number={6}
        about="Rola i własne konto"
        options={[
          { id: 'a', text: 'Możesz nadać rolę Administrator innej osobie; własnej roli nie zmienisz i własnego konta nie zarchiwizujesz' },
          { id: 'b', text: 'Administrator jest tylko jeden (Ty); pole „Rola” znika' },
        ]}
        recommended="a"
      >
        Kto może być administratorem? Administrator nie ma puli dni, więc przy tej roli pola puli znikają z okna.
      </Question>
      <Question
        number={7}
        about="Do archiwum"
        options={[
          { id: 'a', text: 'Wnioski czekające na decyzję wycofują się same, z wpisem w historii zmian' },
          { id: 'b', text: 'Zostają na liście wniosków do Twojej decyzji' },
        ]}
        recommended="a"
      >
        Co z wnioskami czekającymi na decyzję, gdy przenosisz pracownika do archiwum? Przy zadaniach zostaje z dopiskiem
        „zarchiwizowany” (ustalone).
      </Question>
      <Question
        number={8}
        about="Wyszukiwarka i filtry"
        options={[
          { id: 'a', text: 'Szukanie po imieniu, nazwisku i loginie, filtr roli, kolejność: nazwisko albo najmniej dni zostało' },
          { id: 'b', text: 'To samo i dodatkowo filtr „bez e-maila do powiadomień”' },
        ]}
        recommended="a"
      >
        Czy takie szukanie i filtry wystarczą?
      </Question>
      <Question
        number={9}
        about="Szczegóły pracownika"
        options={[
          { id: 'a', text: 'Bez osobnego ekranu: w „Edytuj” zmieniasz pulę bieżącego roku; starsze lata widać w historii zmian' },
          { id: 'b', text: 'Osobny ekran pracownika z pulami z kolejnych lat i jego wnioskami' },
        ]}
        recommended="a"
      >
        Czy potrzebny jest ekran z całą kartoteką jednej osoby?
      </Question>
      <Question number={10} about="Zasady pól">
        Propozycja (odpowiedz „ok” albo popraw pojedyncze pola): Imię i nazwisko: wymagane, 2–150 znaków. Login:
        wymagany, 3–190 znaków, bez spacji, zapisywany małymi literami, niepowtarzalny także wśród kont w archiwum
        (np. jan.kowalski@firma.pl). E-mail do powiadomień: nieobowiązkowy, prawdziwy adres, do 190 znaków,
        niepowtarzalny. Rola: wymagana, domyślnie Pracownik. Hasło tymczasowe: wymagane przy dodawaniu, 8–72 znaki,
        co najmniej jedna cyfra i jeden znak specjalny (jak w Logowaniu). Dni na rok: wymagane, liczba całkowita 0–60,
        domyślnie 26. Zaległe: liczba całkowita 0–60, domyślnie 0.
      </Question>
    </Questions>
  );
}

interface RowActions {
  onEdit: (e: MockEmployee) => void;
  onPassword: (e: MockEmployee) => void;
  onArchive: (e: MockEmployee) => void;
}

function RoleBadge({ role }: { role: MockEmployee['role'] }) {
  const { t } = useTranslation('employees');
  return <Badge variant="light" color={role === 'admin' ? 'navy' : 'gray'}>{t(`role.${role}`)}</Badge>;
}

function NameCell({ e }: { e: MockEmployee }) {
  const { t } = useTranslation('employees');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600}>{e.name}</Text>
        {e.isMe && <Text span size="xs" c="dimmed">({t('me')})</Text>}
      </Group>
      <Text size="sm" c="dimmed">{e.login}</Text>
    </Stack>
  );
}

function Actions({ e, onEdit, onPassword, onArchive }: RowActions & { e: MockEmployee }) {
  const { t } = useTranslation('employees');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(e)}>{t('edit')}</Button>
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="password" size={14} />} onClick={() => onPassword(e)}>{t('set_password')}</Button>
      <Tooltip label={t('archive_self')} disabled={!e.isMe}>
        <Button size="xs" variant="subtle" color="red" leftSection={<ButtonIcon action="archive" size={14} />} disabled={e.isMe} onClick={() => onArchive(e)}>
          {t('archive')}
        </Button>
      </Tooltip>
    </Group>
  );
}

function EmployeesTable({ rows, ...actions }: RowActions & { rows: MockEmployee[] }) {
  const { t } = useTranslation('employees');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH + 260} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_role')}</Table.Th>
            <Table.Th>{t('col_pool', { year: POOL_YEAR })}</Table.Th>
            <Table.Th>{t('col_notify')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((e) => (
            <Table.Tr key={e.id}>
              <Table.Td><NameCell e={e} /></Table.Td>
              <Table.Td><RoleBadge role={e.role} /></Table.Td>
              <Table.Td><PoolMeter pool={e.pool} /></Table.Td>
              <Table.Td>{e.notifyEmail ?? <Text span inherit c="dimmed">{t('no_email')}</Text>}</Table.Td>
              <Table.Td><Actions e={e} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Na telefonie każda osoba to karta zamiast wiersza tabeli. */
function EmployeeCards({ rows, ...actions }: RowActions & { rows: MockEmployee[] }) {
  const { t } = useTranslation('employees');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((e) => (
        <Card key={e.id} withBorder padding="md">
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell e={e} />
              <RoleBadge role={e.role} />
            </Group>
            <PoolMeter pool={e.pool} />
            <Text size="sm" c="dimmed">{t('col_notify')}: {e.notifyEmail ?? t('no_email')}</Text>
            <Actions e={e} {...actions} />
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation('employees');
  return (
    <Paper withBorder p="xl">
      <Stack align="center" gap="sm" ta="center" py="lg">
        <ThemeIcon variant="light" size={48} radius="md"><Users size={26} /></ThemeIcon>
        <Title order={3}>{t('empty_title')}</Title>
        <Text c="dimmed" maw={460}>{t('empty_text')}</Text>
        <Button mt="xs" leftSection={<ButtonIcon action="add" />} onClick={onAdd}>{t('add')}</Button>
      </Stack>
    </Paper>
  );
}

export function EmployeesMockup() {
  const { t } = useTranslation('employees');
  const [state, setState] = useState<State>('list');
  const [form, setForm] = useState<{ employee: MockEmployee | null } | null>(null);
  const [password, setPassword] = useState<MockEmployee | null>(null);
  const [archive, setArchive] = useState<MockEmployee | null>(null);
  const [closeYear, setCloseYear] = useState(false);

  const changeState = (s: State) => {
    setState(s);
    if (s === 'login_taken') setForm({ employee: null });
  };

  const rows = state === 'empty' ? EMPLOYEES.filter((e) => e.isMe) : state === 'no_results' ? [] : EMPLOYEES;
  const query = state === 'no_results' ? t('mockup_no_results_query') : '';
  const actions: RowActions = { onEdit: (e) => setForm({ employee: e }), onPassword: setPassword, onArchive: setArchive };

  return (
    <Stack>
      <EmployeeQuestions />

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

      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Title order={1}>{t('title')}</Title>
          <Text c="dimmed" size="sm">{t('summary', { count: rows.length || 1, admins: 1 })}</Text>
        </Stack>
        <Group gap="xs">
          <Button variant="default" leftSection={<ButtonIcon action="close_year" />} onClick={() => setCloseYear(true)} disabled={state === 'empty'}>
            {t('close_year', { year: POOL_YEAR })}
          </Button>
          <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ employee: null })}>{t('add')}</Button>
        </Group>
      </Group>

      <Group gap="sm" align="flex-end">
        <TextInput
          placeholder={t('search')}
          aria-label={t('search')}
          leftSection={<Search size={16} />}
          defaultValue={query}
          key={query}
          w={{ base: '100%', sm: 340 }}
        />
        <Select
          aria-label={t('filter_role')}
          data={[{ value: 'all', label: t('filter_role_all') }, { value: 'employee', label: t('role.employee') }, { value: 'admin', label: t('role.admin') }]}
          defaultValue="all"
          allowDeselect={false}
          w={{ base: '48%', sm: 180 }}
        />
        <Select
          aria-label={t('sort')}
          data={[{ value: 'name', label: t('sort_name') }, { value: 'left', label: t('sort_left') }]}
          defaultValue="name"
          allowDeselect={false}
          w={{ base: '48%', sm: 200 }}
        />
        <Box style={{ flex: 1 }} />
        <Box visibleFrom="sm"><PoolLegend /></Box>
      </Group>

      {state === 'no_results' ? (
        <Paper withBorder p="lg">
          <Group justify="space-between">
            <Text>{t('no_results', { query })}</Text>
            <Button variant="default" leftSection={<ButtonIcon action="cancel" />} onClick={() => setState('list')}>{t('clear_search')}</Button>
          </Group>
        </Paper>
      ) : (
        <>
          <EmployeesTable rows={rows} {...actions} />
          <EmployeeCards rows={rows} {...actions} />
          {state === 'empty' && <EmptyState onAdd={() => setForm({ employee: null })} />}
        </>
      )}

      {form && (
        <EmployeeModal
          key={`${form.employee?.id ?? 'new'}-${state}`}
          opened
          employee={form.employee}
          loginTaken={state === 'login_taken' && form.employee === null}
          onClose={() => setForm(null)}
        />
      )}
      <PasswordModal employee={password} onClose={() => setPassword(null)} />
      <ArchiveModal employee={archive} onClose={() => setArchive(null)} />
      <CloseYearModal opened={closeYear} onClose={() => setCloseYear(false)} />
    </Stack>
  );
}
