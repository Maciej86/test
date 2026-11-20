import { formatDate } from '@app/shared';

/** Zakres urlopu krótko: „23.11–27.11.2026”. (Termin zadania: `taskDueState` z `@app/shared`.) */
export const leaveRange = (from: string, to: string) => ({ from: formatDate(from)!.slice(0, 5), to: formatDate(to)! });
