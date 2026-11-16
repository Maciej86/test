import { describe, it } from 'vitest';

describe('LeaveTypeFormModal', () => {
  it.todo('adding: "Deducts days" is on, empty name → required');
  it.todo('limit 0 and 366 → error under the field; cleared limit sends null');
  it.todo('editing a type used in requests shows the warning; 0 requests → no warning');
  it.todo('409 name_taken → error under the name');
  it.todo('409 name_taken_hidden → restore link unhides, closes and shows a toast');
  it.todo('success → toast and close');
});

describe('HideLeaveTypeModal', () => {
  it.todo('shows the name and requests count; "Hide" shows a toast');
});
