import { listAdminEmails, type EmailRecipient } from './recipients';
import { sendEmail, type EmailMessage } from './sendEmail';
import { newLeaveRequestEmail, type NewLeaveRequestEmailData } from './templates/newLeaveRequest';

interface Deps {
  listAdminEmails: () => Promise<EmailRecipient[]>;
  sendEmail: (message: EmailMessage) => Promise<unknown>;
}

/**
 * E-mail o nowym wniosku do każdego administratora z adresem, osobno i równocześnie. Wołać po zapisaniu wniosku,
 * poza transakcją. Nigdy nie rzuca: wniosek jest już zapisany, a błąd (baza, wzór, wysyłka) trafia tylko do
 * dziennika serwera (pytanie 4a). Zwraca liczbę wysłanych e-maili.
 */
export const emailAdminsAboutNewRequest = async (
  data: NewLeaveRequestEmailData,
  deps: Deps = { listAdminEmails: () => listAdminEmails(), sendEmail: (m) => sendEmail(m) },
): Promise<number> => {
  try {
    const recipients = await deps.listAdminEmails();
    if (recipients.length === 0) return 0;
    const email = newLeaveRequestEmail(data);
    const results = await Promise.allSettled(recipients.map((r) => deps.sendEmail({ ...email, to: r.email })));
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        console.error('email failed', { requestId: data.requestId, to: recipients[i]!.email }, result.reason);
      }
    });
    return results.filter((r) => r.status === 'fulfilled').length;
  } catch (error) {
    console.error('email failed', { requestId: data.requestId }, error);
    return 0;
  }
};
