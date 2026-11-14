import type { ReactNode } from 'react';
import { Box, Paper, SimpleGrid, Stack } from '@mantine/core';
import { CalendarSheet, PhoneHeader } from './CalendarSheet';

/** Wspólny układ ekranów logowania i ustawiania hasła: kartka z kalendarza po lewej, karta z formularzem po prawej. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <Box bg="var(--app-panel-background)" mih="100vh" py={{ base: 'lg', md: 96 }} px={{ base: 'md', md: 'xl' }}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={64} maw={960} mx="auto" style={{ alignItems: 'center' }}>
        <Box visibleFrom="md">
          <CalendarSheet />
        </Box>
        <Box>
          <PhoneHeader />
          <Paper withBorder p="xl" bg="dark.6" w="100%" maw={420}>
            <Stack gap="md">{children}</Stack>
          </Paper>
        </Box>
      </SimpleGrid>
    </Box>
  );
}
