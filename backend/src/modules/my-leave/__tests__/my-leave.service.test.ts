import { describe, it } from 'vitest';

describe('my leave service: overview and list', () => {
  it.todo('overview: leftDays = annual + carried − approved − pending; leftCarriedDays');
  it.todo('overview: usedOfLimit per type, years include the open year');
  it.todo('overview without open pool → null');
  it.todo('list: pending first, then date_from descending');
});

describe('my leave service: create', () => {
  it.todo('locks the pool row before counting (FOR UPDATE)');
  it.todo('no open pool → 404; hidden or missing type → 400 field leaveTypeId');
  it.todo('past date → 400 field dateFrom past_date; other checks → 409 with data');
  it.todo('server counts days and split, user id from actor');
  it.todo('logs activity and notifies admins in the transaction, e-mail after it');
  it.todo('e-mail error does not break the answer');
});

describe('my leave service: withdraw', () => {
  it.todo('foreign or missing request → 404');
  it.todo('not pending → 409 not_pending; second withdraw → 409');
  it.todo('pending → withdrawn, activity and notification');
});
