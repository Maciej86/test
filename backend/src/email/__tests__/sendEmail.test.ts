import { describe, it } from 'vitest';

describe('sendEmail', () => {
  it.todo('sends to the given address with subject, html and non-empty text');
  it.todo('sets the sender name to the app name and the address from EMAIL_FROM');
  it.todo('logs in to SMTP only when SMTP_USER is set');
});
