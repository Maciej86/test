import { describe, it } from 'vitest';

describe('decision modals', () => {
  it.todo('approve: green button, "W tym czasie urlop ma też", yellow frame for a past date');
  it.todo('reject and cancel: reason required under the field, server 400 under the field');
  it.todo('success: notice, modal and details close');
  it.todo('409 already_decided: notice (also "Pracownik wycofał ten wniosek."), close and refresh');
  it.todo('other error: notice, modal stays open');
});
