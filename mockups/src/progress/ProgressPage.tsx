import { Badge, Code, List, Stack, Table, Text, ThemeIcon, Title } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { TABLE_MIN_WIDTH } from '@app/shared';
import statusText from '../../../docs/STATUS.md?raw';
import { dependencyNames, parseStatus, type ModuleStatus } from './parseStatus';

const COLORS: Record<ModuleStatus, string> = {
  zrobiony: 'green',
  'w toku': 'blue',
  wstrzymany: 'orange',
  czeka: 'gray',
};

export function ProgressPage({ source = statusText }: { source?: string }) {
  const { t } = useTranslation();
  const result = parseStatus(source);
  if (!result.ok) {
    return (
      <Stack>
        <Title order={2}>{t('mockup.status_error')}</Title>
        <Text c="red">{result.reason}</Text>
        <Code block>{source}</Code>
      </Stack>
    );
  }
  const { nextStep, startSteps, modules } = result.status;
  const dependsText = (names: string[] | 'all') =>
    names === 'all' ? t('mockup.depends_all') : names.join(', ') || '—';
  return (
    <Stack>
      <Title order={2}>{t('mockup.progress_title')}</Title>
      {nextStep && (
        <Text>
          <strong>{t('mockup.next_step')}:</strong> {nextStep}
        </Text>
      )}
      {startSteps.length > 0 && (
        <>
          <Title order={4}>{t('mockup.start_steps')}</Title>
          <List spacing={4} icon={<span />}>
            {startSteps.map((s) => (
              <List.Item key={s.label} icon={<ThemeIcon size={16} radius="xl" color={s.done ? 'green' : 'gray'} />}>
                {s.label}
              </List.Item>
            ))}
          </List>
        </>
      )}
      <Title order={4}>{t('mockup.modules')}</Title>
      {modules.length === 0 ? (
        <Text c="dimmed">{t('mockup.no_modules')}</Text>
      ) : (
        <Table.ScrollContainer minWidth={TABLE_MIN_WIDTH}>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('mockup.col_number')}</Table.Th>
                <Table.Th>{t('mockup.col_module')}</Table.Th>
                <Table.Th>{t('mockup.col_status')}</Table.Th>
                <Table.Th>{t('mockup.col_stage')}</Table.Th>
                <Table.Th>{t('mockup.col_depends')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {modules.map((m) => (
                <Table.Tr key={m.number}>
                  <Table.Td>{m.number}</Table.Td>
                  <Table.Td>{m.name}</Table.Td>
                  <Table.Td>
                    <Badge color={COLORS[m.status]}>{m.status}</Badge>
                  </Table.Td>
                  <Table.Td>{m.stage}</Table.Td>
                  <Table.Td>{dependsText(dependencyNames(m, modules))}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      )}
    </Stack>
  );
}
