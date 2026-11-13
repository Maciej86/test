import { Children, type ReactNode } from 'react';
import { Badge, Button, Collapse, Group, List, Paper, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

interface QuestionProps {
  number: number;
  /** Której części ekranu dotyczy pytanie, np. „Kalendarz”, „Tabela wniosków”. */
  about?: string;
  options?: { id: string; text: string }[];
  recommended?: string;
  children: ReactNode;
}

/**
 * Wszystkie pytania do ekranu makiety, w jednym panelu na samej górze ekranu (nad makietą, nie pomiędzy jej częściami).
 * Numery zgodne z docs/modules/<module>/QUESTIONS.md.
 */
export function Questions({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [opened, { toggle }] = useDisclosure(true);
  const count = Children.toArray(children).length;
  if (count === 0) return null;
  return (
    <Paper withBorder p="md" mb="lg" bg="yellow.0" style={{ borderColor: 'var(--mantine-color-yellow-4)' }}>
      <Group justify="space-between">
        <Text fw={700}>{t('mockup.questions_title', { count })}</Text>
        <Button variant="subtle" color="yellow.9" size="xs" onClick={toggle}>
          {opened ? t('mockup.questions_hide') : t('mockup.questions_show')}
        </Button>
      </Group>
      <Collapse expanded={opened}>
        <Stack gap="md" mt="sm">
          {children}
        </Stack>
      </Collapse>
    </Paper>
  );
}

/** Jedno pytanie; wstawiaj tylko wewnątrz <Questions>. */
export function Question({ number, about, options, recommended, children }: QuestionProps) {
  const { t } = useTranslation();
  return (
    <div>
      <Group gap="xs">
        <Text size="sm" fw={700} c="yellow.9">
          {t('mockup.question', { number })}
        </Text>
        {about && (
          <Badge variant="light" color="gray" size="sm" tt="none">
            {t('mockup.question_about', { about })}
          </Badge>
        )}
      </Group>
      <Text size="sm" mt={4}>
        {children}
      </Text>
      {options && (
        <List size="sm" mt={4}>
          {options.map((o) => (
            <List.Item key={o.id}>
              {o.id}) {o.text} {o.id === recommended && <strong>{t('mockup.recommended')}</strong>}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  );
}
