import { listAdminEmails, type EmailRecipient } from './recipients';
import { sendEmail, type EmailMessage } from './sendEmail';
import { newLeaveRequestEmail, type NewLeaveRequestEmailData } from './templates/newLeaveRequest';

interface Deps {
  listAdminEmails: () => Promise<EmailRecipient[]>;
  sendEmail: (message: EmailMessage) => Promise<unknown>;
}

/**
 * E-mail o nowym wniosku do każdego administratora z adresem, osobno. Wołać po zapisaniu wniosku, poza transakcją.
 * Nigdy nie rzuca: wniosek jest już zapisany, a błąd wysyłki trafia tylko do dziennika serwera (pytanie 4a).
 * Zwraca liczbę wysłanych e-maili.
 */
export const emailAdminsAboutNewRequest = async (
  data: NewLeaveRequestEmailData,
  deps: Deps = { listAdminEmails: () => listAdminEmails(), sendEmail: (m) => sendEmail(m) },
): Promise<number> => {
  let recipients: EmailRecipient[];
  try {
    recipients = await deps.listAdminEmails();
  } catch (error) {
    console.error('email failed', { requestId: data.requestId }, error);
    return 0;
  }
  if (recipients.length === 0) return 0;

  const email = newLeaveRequestEmail(data);
  let sent = 0;
  for (const r of recipients) {
    try {
      await deps.sendEmail({ ...email, to: r.email });
      sent += 1;
    } catch (error) {
      console.error('email failed', { requestId: data.requestId, to: r.email }, error);
    }
  }
  return sent;
};
