import { describe, it } from 'vitest';

describe('emailAdminsAboutNewRequest', () => {
  it.todo('sends a separate email to each admin');
  it.todo('a failing recipient does not stop the others and does not throw');
  it.todo('no admins with an email → nothing sent, returns 0');
  it.todo('a database error is logged and returns 0');
});
