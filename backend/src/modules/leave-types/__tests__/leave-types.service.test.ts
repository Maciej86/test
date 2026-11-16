import { describe, it } from 'vitest';

describe('leave types service', () => {
  it.todo('createType puts the new type at the end (maxPosition + 1)');
  it.todo('name taken by visible type → 409 name_taken; by hidden → name_taken_hidden with hiddenType');
  it.todo('ER_DUP_ENTRY from the database → 409 name_taken');
  it.todo('updateType skips itself when checking the name; missing → 404');
  it.todo('moveType swaps position with the visible neighbour (positions 1, 3, 4)');
  it.todo('moveType at the edge → ok without writes; hidden or missing → 404');
  it.todo('hideType: missing → 404, already hidden → 409, last visible → 409 last_visible');
  it.todo('unhideType: missing → 404, visible → 409 not_hidden, restored at the end');
});
