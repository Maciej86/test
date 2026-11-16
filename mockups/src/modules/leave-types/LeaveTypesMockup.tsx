import { useState } from 'react';
import { ActionIcon, Badge, Button, Card, Group, Paper, SegmentedControl, Stack, Switch, Table, Text, Title } from '@mantine/core';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import { ButtonIcon } from '../../common/ButtonIcon';
import { notify } from '../../common/notify';
import { Question, Questions } from '../../common/Question';
import { HideModal, LeaveTypeModal } from './LeaveTypeModals';
import { LEAVE_TYPES, type MockLeaveType } from './data';

const STATES = ['list', 'with_hidden', 'name_taken', 'edit_used'] as const;
type State = (typeof STATES)[number];

interface RowActions {
  onEdit: (lt: MockLeaveType) => void;
  onHide: (lt: MockLeaveType) => void;
}

function ScreenQuestions() {
  return (
    <Questions>
      <Question
        number={1}
        about="Limit w roku"
        options={[
          { id: 'a', text: 'Limit liczy się osobno dla każdej osoby, w dniach roboczych, w roku kalendarzowym. Wliczają się wnioski czekające i zatwierdzone, więc nie da się złożyć dwóch, które razem go przekroczą' },
          { id: 'b', text: 'Wliczają się tylko wnioski zatwierdzone; czekające nie blokują kolejnego' },
        ]}
        recommended="a"
      >
        Jak liczyć „Limit w roku” (np. Na żądanie: 4 dni na osobę)?
      </Question>
      <Question
        number={2}
        about="Okno Edytuj"
        options={[
          { id: 'a', text: 'Nową nazwę widać we wszystkich wnioskach, także starych; „Odejmuje dni z puli” i limit działają tylko dla nowych wniosków (żółta ramka w oknie, stan „Edycja typu we wnioskach”)' },
          { id: 'b', text: 'Gdy typ jest już we wnioskach, „Odejmuje dni z puli” jest zablokowane; inną zasadę ustawia się, dodając nowy typ' },
        ]}
        recommended="a"
      >
        Co się dzieje, gdy zmienisz typ, który jest już we wnioskach?
      </Question>
      <Question
        number={3}
        about="Tabela typów"
        options={[
          { id: 'a', text: 'Ukryte są schowane; przełącznik „Pokaż ukryte” dopisuje je przygaszone, z przyciskiem „Przywróć” (stan „Z ukrytymi”)' },
          { id: 'b', text: 'Ukryte są zawsze widoczne na dole listy, przygaszone' },
        ]}
        recommended="a"
      >
        Jak pokazywać ukryte typy?
      </Question>
      <Question
        number={4}
        about="Ukryj"
        options={[
          { id: 'a', text: 'Typy tylko się ukrywa, bez usuwania na stałe (tak mówi spec ogólny; ukryty typ wraca jednym kliknięciem)' },
          { id: 'b', text: 'Typ, którego nie ma w żadnym wniosku (np. dodany przez pomyłkę), można też usunąć na stałe' },
        ]}
        recommended="a"
      >
        Czy typ urlopu da się usunąć?
      </Question>
      <Question
        number={5}
        about="Kolejność"
        options={[
          { id: 'a', text: 'Własna kolejność, ustawiana strzałkami w pierwszej kolumnie tabeli; nowy typ trafia na koniec' },
          { id: 'b', text: 'Alfabetycznie (wtedy Wypoczynkowy jest prawie na końcu listy)' },
        ]}
        recommended="a"
      >
        W jakiej kolejności typy są na liście i w formularzu wniosku pracownika?
      </Question>
      <Question
        number={6}
        about="Okno Dodaj / Edytuj"
        options={[
          { id: 'a', text: 'Bez opisu: wystarczy nazwa' },
          { id: 'b', text: 'Krótki opis (do 200 znaków), który pracownik zobaczy pod listą typów we wniosku, np. „Okolicznościowy: ślub, narodziny dziecka, pogrzeb”' },
        ]}
        recommended="a"
      >
        Czy typ ma mieć opis dla pracownika?
      </Question>
      <Question
        number={7}
        about="Kolumna Wnioski"
      >
        Kolumna „Wnioski” pokazuje, w ilu wnioskach (ze wszystkich lat) jest typ, żeby przed ukryciem albo zmianą było
        widać, czego to dotyczy. Liczby pojawią się, gdy powstanie moduł „Moje urlopy”; do tego czasu wszędzie będzie
        0. Zostawić tę kolumnę? (polecam: tak)
      </Question>
      <Question
        number={8}
        about="Zasady pól"
      >
        Propozycja (odpowiedz „ok” albo popraw pojedyncze pola): Nazwa: wymagana, 2–40 znaków, niepowtarzalna także
        wśród ukrytych, bez względu na wielkie i małe litery (np. Na żądanie). Odejmuje dni z puli: przełącznik,
        domyślnie włączony. Limit dni w roku: nieobowiązkowy, liczba całkowita 1–365.
      </Question>
    </Questions>
  );
}

function DeductsBadge({ deducts }: { deducts: boolean }) {
  const { t } = useTranslation('leave-types');
  return <Badge variant="light" color={deducts ? 'navy' : 'gray'}>{deducts ? t('deducts_yes') : t('deducts_no')}</Badge>;
}

function NameCell({ lt }: { lt: MockLeaveType }) {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap={0}>
      <Group gap={6} wrap="nowrap">
        <Text fw={600} c={lt.hidden ? 'dimmed' : undefined}>{lt.name}</Text>
        {lt.hidden && <Badge variant="outline" color="gray" size="sm">{t('hidden_badge')}</Badge>}
      </Group>
      {lt.hidden && <Text size="xs" c="dimmed">{t('hidden_hint')}</Text>}
    </Stack>
  );
}

function LimitText({ limit }: { limit: number | null }) {
  const { t } = useTranslation('leave-types');
  return limit === null ? <Text span inherit c="dimmed">{t('no_limit')}</Text> : <>{t('limit_days', { count: limit })}</>;
}

/** Strzałki kolejności: ta sama kolejność jest w formularzu wniosku pracownika. */
function OrderArrows({ index, count }: { index: number; count: number }) {
  const { t } = useTranslation('leave-types');
  return (
    <Group gap={2} wrap="nowrap">
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_up')} disabled={index === 0}>
        <ChevronUp size={16} />
      </ActionIcon>
      <ActionIcon variant="subtle" color="gray" size="sm" aria-label={t('move_down')} disabled={index === count - 1}>
        <ChevronDown size={16} />
      </ActionIcon>
    </Group>
  );
}

function Actions({ lt, onEdit, onHide }: RowActions & { lt: MockLeaveType }) {
  const { t } = useTranslation('leave-types');
  return (
    <Group gap={4} justify="flex-end" wrap="nowrap">
      <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="edit" size={14} />} onClick={() => onEdit(lt)}>{t('edit')}</Button>
      {lt.hidden ? (
        <Button size="xs" variant="subtle" leftSection={<ButtonIcon action="unhide" size={14} />} onClick={() => notify.success(t('unhidden_done'))}>
          {t('unhide')}
        </Button>
      ) : (
        <Button size="xs" variant="subtle" color="gray" leftSection={<ButtonIcon action="hide" size={14} />} onClick={() => onHide(lt)}>
          {t('hide')}
        </Button>
      )}
    </Group>
  );
}

function LeaveTypesTable({ rows, visibleCount, ...actions }: RowActions & { rows: MockLeaveType[]; visibleCount: number }) {
  const { t } = useTranslation('leave-types');
  return (
    <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH} visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={70} aria-label={t('col_order')} />
            <Table.Th>{t('col_name')}</Table.Th>
            <Table.Th>{t('col_deducts')}</Table.Th>
            <Table.Th>{t('col_limit')}</Table.Th>
            <Table.Th ta="right">{t('col_requests')}</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((lt, i) => (
            <Table.Tr key={lt.id}>
              <Table.Td>{!lt.hidden && <OrderArrows index={i} count={visibleCount} />}</Table.Td>
              <Table.Td><NameCell lt={lt} /></Table.Td>
              <Table.Td><DeductsBadge deducts={lt.deducts} /></Table.Td>
              <Table.Td c={lt.hidden ? 'dimmed' : undefined}><LimitText limit={lt.limit} /></Table.Td>
              <Table.Td ta="right" c="dimmed">{lt.requests}</Table.Td>
              <Table.Td><Actions lt={lt} {...actions} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Na telefonie każdy typ to karta zamiast wiersza tabeli. */
function LeaveTypeCards({ rows, visibleCount, ...actions }: RowActions & { rows: MockLeaveType[]; visibleCount: number }) {
  const { t } = useTranslation('leave-types');
  return (
    <Stack gap="sm" hiddenFrom="sm">
      {rows.map((lt, i) => (
        <Card key={lt.id} withBorder padding="md">
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <NameCell lt={lt} />
              <DeductsBadge deducts={lt.deducts} />
            </Group>
            <Text size="sm" c="dimmed">
              {t('col_limit')}: <LimitText limit={lt.limit} />
            </Text>
            <Text size="sm" c="dimmed">{t('requests_count', { count: lt.requests })}</Text>
            <Group justify="space-between" wrap="nowrap">
              {lt.hidden ? <span /> : <OrderArrows index={i} count={visibleCount} />}
              <Actions lt={lt} {...actions} />
            </Group>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}

export function LeaveTypesMockup() {
  const { t } = useTranslation('leave-types');
  const [state, setState] = useState<State>('list');
  const [showHidden, setShowHidden] = useState(false);
  const [form, setForm] = useState<{ leaveType: MockLeaveType | null } | null>(null);
  const [hide, setHide] = useState<MockLeaveType | null>(null);

  const changeState = (s: State) => {
    setState(s);
    setShowHidden(s === 'with_hidden');
    if (s === 'name_taken') setForm({ leaveType: null });
    if (s === 'edit_used') setForm({ leaveType: LEAVE_TYPES[1]! });
  };

  const visible = LEAVE_TYPES.filter((lt) => !lt.hidden);
  const hidden = LEAVE_TYPES.filter((lt) => lt.hidden);
  const rows = showHidden ? [...visible, ...hidden] : visible;
  const actions: RowActions = { onEdit: (lt) => setForm({ leaveType: lt }), onHide: setHide };

  return (
    <Stack>
      <ScreenQuestions />

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
          <Text c="dimmed" size="sm">{t('summary', { visible: visible.length, hidden: hidden.length })}</Text>
        </Stack>
        <Group gap="md">
          <Switch
            label={t('show_hidden', { count: hidden.length })}
            checked={showHidden}
            onChange={(e) => setShowHidden(e.currentTarget.checked)}
          />
          <Button leftSection={<ButtonIcon action="add" />} onClick={() => setForm({ leaveType: null })}>{t('add')}</Button>
        </Group>
      </Group>

      <LeaveTypesTable rows={rows} visibleCount={visible.length} {...actions} />
      <LeaveTypeCards rows={rows} visibleCount={visible.length} {...actions} />

      {form && (
        <LeaveTypeModal
          key={`${form.leaveType?.id ?? 'new'}-${state}`}
          leaveType={form.leaveType}
          nameTaken={state === 'name_taken' && form.leaveType === null}
          onClose={() => setForm(null)}
        />
      )}
      <HideModal leaveType={hide} onClose={() => setHide(null)} />
    </Stack>
  );
}
