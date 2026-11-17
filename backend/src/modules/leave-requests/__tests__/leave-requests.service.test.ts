import { describe, it } from 'vitest';

describe('leave requests: list and details', () => {
  it.todo('list items have poolLeft from the open pool (Jan: 19 of 30), null without a pool');
  it.todo('canCancel only for approved requests whose pool year is still open');
  it.todo('details: 404 for a missing request; others only for pending and approved; pool only when open');
});

describe('leave requests: decisions', () => {
  it.todo('approve: pending → approved, decided by the actor, history entry and leave_approved notification');
  it.todo('reject: pending → rejected with the reason, leave_rejected notification with reason');
  it.todo('cancel: approved → cancelled with the reason, leave_cancelled notification with reason');
  it.todo('decision on a request that is not pending → 409 already_decided with status and decidedByName');
  it.todo('cancel of a request that is not approved → 409 not_approved; closed pool year → 409 year_closed');
  it.todo('two approvals at once: one ok, one 409, one history entry, one notification');
  it.todo('request of an archived employee can be approved');
});
