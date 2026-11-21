// Docelowo: frontend/src/modules/leave-types/__tests__, my-leave/__tests__, leave-requests/__tests__, common/__tests__
import { describe, it } from 'vitest';

describe('done modules: day count and approval', () => {
  it.todo('leave types table shows day count and approval columns');
  it.todo('leave type form has day count radio and approval switch (new type: working, on)');
  it.todo('request modal for type without approval: hint, "Zgłoś" button, from date 7 days back');
  it.todo('request modal for calendar type: every day counts, result in calendar days');
  it.todo('requests table: column "Dni" with unit, "Wycofaj" by canWithdraw');
  it.todo('details drawer of auto-approved request: "Zatwierdzony automatycznie", no approve/reject');
  it.todo('notification leave_absence_reported text with calendar days');
  it.todo('calendar draws calendar-day request as one continuous bar');
});
