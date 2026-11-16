import { useState } from 'react';
import { Box, Button, Code, Divider, Group, Paper, SegmentedControl, Stack, Text, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '@app/shared';
import { Question, Questions } from '../../common/Question';
import { NEW_REQUEST_EMAIL as mail } from './data';

const STATES = ['html', 'text', 'no_comment', 'mobile'] as const;
type State = (typeof STATES)[number];

/** Teksty e-maila z tymi samymi kluczami, których użyje szablon na serwerze. */
const useMailTexts = (withComment: boolean) => {
  const { t } = useTranslation('email');
  const dateFrom = formatDate(mail.dateFrom) ?? '';
  const dateTo = formatDate(mail.dateTo) ?? '';
  const rows: [string, string][] = [
    [t('new_request.employee'), mail.employee],
    [t('new_request.leave_type'), mail.leaveType],
    [t('new_request.working_days'), t('new_request.working_days_value', { count: mail.workingDays })],
    [t('new_request.split'), t('new_request.split_value', { carried: mail.fromCarried, annual: mail.fromAnnual })],
    [t('new_request.left_after'), t('new_request.left_after_value', { count: mail.leftAfter })],
    ...(withComment ? [[t('new_request.comment'), mail.comment] as [string, string]] : []),
  ];
  return {
    subject: t('new_request.subject', { employee: mail.employee, dateFrom, dateTo }),
    heading: t('new_request.heading'),
    intro: t('new_request.intro', { employee: mail.employee }),
    datesLabel: t('new_request.dates'),
    dates: `${dateFrom} – ${dateTo}`,
    rows,
    button: t('new_request.button'),
    linkHint: t('new_request.link_hint', { link: mail.link }),
    footer: t('new_request.footer'),
  };
};

type MailTexts = ReturnType<typeof useMailTexts>;

/** Nagłówek jak w programie pocztowym: od, do, temat, kiedy. */
const MailHeader = ({ texts }: { texts: MailTexts }) => {
  const { t } = useTranslation('email');
  const line = (label: string, value: string) => (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text size="sm" c="dimmed" w={70} style={{ flexShrink: 0 }}>{label}</Text>
      <Text size="sm">{value}</Text>
    </Group>
  );
  return (
    <Stack gap={4} p="md">
      <Text ff="heading" fw={600} size="lg">{texts.subject}</Text>
      {line(t('preview.from'), `${mail.fromName} <${mail.fromAddress}>`)}
      {line(t('preview.to'), `${mail.toName} <${mail.toAddress}>`)}
      {line(t('preview.sent'), formatDateTime(mail.sentAt) ?? '')}
    </Stack>
  );
};

/** Treść e-maila: jasna kartka (programy pocztowe pokazują e-maile na białym tle), prosta i czytelna. */
const MailBody = ({ texts, narrow }: { texts: MailTexts; narrow: boolean }) => (
  <Box bg="gray.1" p={narrow ? 'xs' : { base: 'xs', sm: 'xl' }}>
    <Paper bg="white" c="dark.9" maw={560} mx="auto" radius="xs" style={{ overflow: 'hidden', border: '1px solid var(--mantine-color-gray-3)' }}>
      <Box bg="navy.8" px="lg" py="sm">
        <Text ff="heading" fw={600} c="white">{mail.fromName}</Text>
      </Box>
      <Stack gap="md" p={narrow ? 'md' : 'lg'}>
        <Title order={2} c="dark.9" fz={24}>{texts.heading}</Title>
        <Text c="dark.7">{texts.intro}</Text>

        <Box pl="md" py={4} style={{ borderLeft: '3px solid var(--mantine-color-navy-6)' }}>
          <Text size="sm" c="gray.6">{texts.datesLabel}</Text>
          <Text ff="heading" fw={600} fz={narrow ? 22 : 26} lh={1.2} c="dark.9">{texts.dates}</Text>
        </Box>

        <Stack gap={0}>
          {texts.rows.map(([label, value]) => (
            <Group key={label} gap="md" wrap="nowrap" align="baseline" py={6} style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Text size="sm" c="gray.6" w={narrow ? 110 : { base: 110, xs: 180 }} style={{ flexShrink: 0 }}>{label}</Text>
              <Text size="sm" c="dark.9">{value}</Text>
            </Group>
          ))}
        </Stack>

        <Group>
          <Button component="a" href="#" color="navy.7" size="md" onClick={(e) => e.preventDefault()}>{texts.button}</Button>
        </Group>
        <Text size="xs" c="gray.6" style={{ wordBreak: 'break-all' }}>{texts.linkHint}</Text>
      </Stack>
      <Divider color="gray.2" />
      <Text size="xs" c="gray.6" p="lg">{texts.footer}</Text>
    </Paper>
  </Box>
);

/** Ta sama treść bez kolorów i przycisku (każdy e-mail ma też taką wersję). */
const MailText = ({ texts }: { texts: MailTexts }) => {
  const { t } = useTranslation('email');
  const lines = [
    texts.heading,
    '',
    texts.intro,
    '',
    `${texts.datesLabel}: ${texts.dates}`,
    ...texts.rows.map(([label, value]) => `${label}: ${value}`),
    '',
    `${texts.button}: ${mail.link}`,
    '',
    '--',
    texts.footer,
  ];
  return (
    <Stack gap="xs" p="md">
      <Text size="sm" c="dimmed">{t('preview.text_hint')}</Text>
      <Code block style={{ whiteSpace: 'pre-wrap' }}>{lines.join('\n')}</Code>
    </Stack>
  );
};

export const EmailMockup = () => {
  const { t } = useTranslation('email');
  const [state, setState] = useState<State>('html');
  const texts = useMailTexts(state !== 'no_comment');

  return (
    <Stack>
      <Questions>
        <Question
          number={1}
          about="Treść e-maila"
          options={[
            { id: 'a', text: 'Wszystko, co pomaga zdecydować: kto, typ, termin, dni robocze, z której puli, ile zostanie i komentarz pracownika' },
            { id: 'b', text: 'To samo, ale bez komentarza (komentarz bywa prywatny; przeczytasz go w aplikacji)' },
            { id: 'c', text: 'Tylko „Nowy wniosek od Jan Kowalski” i przycisk, szczegóły wyłącznie w aplikacji' },
          ]}
          recommended="a"
        >
          Co ma być w e-mailu o nowym wniosku?
        </Question>
        <Question
          number={2}
          about="Temat"
          options={[
            { id: 'a', text: '„Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027”: widać wszystko już na liście e-maili' },
            { id: 'b', text: 'Krótko: „Nowy wniosek urlopowy”' },
          ]}
          recommended="a"
        >
          Jaki temat e-maila?
        </Question>
        <Question
          number={3}
          about="Od"
          options={[
            { id: 'a', text: 'Nazwa aplikacji: „Urlopy i zadania”' },
            { id: 'b', text: 'Nazwa firmy (napisz jaka)' },
          ]}
          recommended="a"
        >
          Jaka nazwa nadawcy ma się pokazać w skrzynce?
        </Question>
        <Question
          number={4}
          about="Gdy e-mail nie wyjdzie"
          options={[
            { id: 'a', text: 'Wniosek i tak się zapisuje, pracownik nic nie widzi; administrator ma wniosek w aplikacji i w dzwonku, a błąd trafia do dziennika serwera' },
            { id: 'b', text: 'Wniosek się zapisuje, a pracownik widzi dymek „Wniosek złożony, ale e-mail do administratora nie doszedł”' },
          ]}
          recommended="a"
        >
          Co, gdy wysyłka e-maila się nie uda (np. chwilowa awaria poczty)?
        </Question>
        <Question
          number={5}
          about="Prawdziwa wysyłka"
          options={[
            { id: 'a', text: 'Do publikacji e-maile łapie skrzynka testowa na Twoim komputerze (nikt ich nie dostaje); prawdziwą wysyłkę ustawimy przy publikacji, z adresem w Twojej domenie' },
            { id: 'b', text: 'Już teraz, żebyś dostawał prawdziwe e-maile na swoją skrzynkę (darmowe konto w Mailgun, ok. 15 minut, działa tylko na adresy, które sam zatwierdzisz)' },
          ]}
          recommended="a"
        >
          Kiedy włączyć prawdziwą wysyłkę e-maili?
        </Question>
      </Questions>

      <Paper p="xs" bg="yellow.4" c="dark.9">
        <Group gap="sm">
          <Text size="sm" fw={600}>{t('preview.state')}</Text>
          <SegmentedControl
            size="xs"
            value={state}
            onChange={(v) => setState(v as State)}
            data={STATES.map((s) => ({ value: s, label: t(`preview.states.${s}`) }))}
            style={{ flexWrap: 'wrap' }}
          />
        </Group>
      </Paper>

      <Stack gap={2}>
        <Title order={1}>{t('preview.title')}</Title>
        <Text c="dimmed" size="sm">{t('preview.summary')}</Text>
      </Stack>

      <Paper withBorder maw={state === 'mobile' ? 390 : undefined} style={{ overflow: 'hidden' }}>
        <MailHeader texts={texts} />
        <Divider />
        {state === 'text' ? <MailText texts={texts} /> : <MailBody texts={texts} narrow={state === 'mobile'} />}
      </Paper>
    </Stack>
  );
};
