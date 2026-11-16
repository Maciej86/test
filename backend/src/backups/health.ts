import { lastDueSlot } from './schedule';

// Stan kopii zapasowych i warunek alarmu. Ta sama funkcja liczy boks na pulpicie i decyzję o mailu: nie mogą sobie
// przeczyć. Kopia jest zaległa, gdy od zaplanowanej godziny minęło ponad 60 minut, a od tej godziny nie ma udanej
// kopii. Próg typu „10 godzin bez kopii” dawałby fałszywy alarm co dzień: przerwa 0:00 → 11:00 trwa 11 godzin
// (12 w dniu zmiany czasu na zimowy), a fałszywy mail zjada dobowy limit i prawdziwa awaria przechodzi po cichu.
export const ALERT_GRACE_MINUTES = 60;
export const ALERT_EVERY_HOURS = 24;
const HOUR_MS = 3600 * 1000;

export type BackupProblem = 'never' | 'failed' | 'stale';

export interface BackupRun {
  startedAt: Date;
  status: 'success' | 'failed' | 'skipped';
  error: string | null;
}

export interface BackupHealth {
  ok: boolean;
  problem: BackupProblem | null;
  lastSuccessAt: Date | null;
  lastRun: BackupRun | null;
  /** Godzina kopii, która przepadła (tylko przy „stale”). */
  missedSlotAt: Date | null;
}

/** `lastRun` = ostatni przebieg o statusie innym niż `skipped` (skipped = próba albo równoległy przebieg). */
export function backupHealth(input: {
  lastRun: BackupRun | null;
  lastSuccessAt: Date | null;
  now: Date;
  slots: string[];
}): BackupHealth {
  const { lastRun, lastSuccessAt, now, slots } = input;
  let problem: BackupProblem | null = null;
  let missedSlotAt: Date | null = null;
  if (!lastSuccessAt) problem = 'never';
  else if (lastRun?.status === 'failed') problem = 'failed';
  else {
    const slot = lastDueSlot(now, ALERT_GRACE_MINUTES * 60 * 1000, slots);
    if (slot && lastSuccessAt < slot) {
      problem = 'stale';
      missedSlotAt = slot;
    }
  }
  return { ok: problem === null, problem, lastSuccessAt, lastRun, missedSlotAt };
}

/** Najwyżej jeden mail na dobę; brak maila „wróciło do normy”. */
export function shouldAlert(health: BackupHealth, lastSentAt: Date | null, now: Date): boolean {
  if (health.ok) return false;
  return !lastSentAt || now.getTime() - lastSentAt.getTime() >= ALERT_EVERY_HOURS * HOUR_MS;
}
