import { describe, expect, it, vi } from 'vitest';
import type { EmailMessage } from '../../email/sendEmail';
import { sendTestEmail } from '../sendTestEmail';

describe('sendTestEmail', () => {
  it('sends the sample new-request email to the given address', async () => {
    const send = vi.fn<(m: EmailMessage) => Promise<unknown>>(async () => ({}));
    await sendTestEmail('ania@firma.pl', send);
    expect(send).toHaveBeenCalledTimes(1);
    const mail = send.mock.calls[0]![0];
    expect(mail.to).toBe('ania@firma.pl');
    expect(mail.subject).toBe('Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027');
    expect(mail.text).toContain('Ferie z dziećmi w górach.');
  });
});
