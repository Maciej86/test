import { pathToFileURL } from 'node:url';
import { createI18n } from '@app/shared';
import { sendEmail, type EmailMessage } from '../email/sendEmail';
import { newLeaveRequestEmail, type NewLeaveRequestEmailData } from '../email/templates/newLeaveRequest';

// `npm run email:test [adres]`: przykładowy e-mail „Nowy wniosek urlopowy” (dane jak w makiecie modułu E-mail).
// Lokalnie trafia do skrzynki testowej Mailpit, po ustawieniu Mailgun na prawdziwy adres.

const SAMPLE: NewLeaveRequestEmailData = {
  requestId: 128,
  employeeName: 'Jan Kowalski',
  leaveTypeName: 'Wypoczynkowy',
  dateFrom: '2027-02-08',
  dateTo: '2027-02-12',
  workingDays: 5,
  daysFromCarried: 3,
  daysFromAnnual: 2,
  leftAfter: 24,
  comment: 'Ferie z dziećmi w górach. W pilnej sprawie jestem pod telefonem.',
};

export const sendTestEmail = async (to: string, send: (m: EmailMessage) => Promise<unknown> = sendEmail): Promise<void> => {
  await send({ ...newLeaveRequestEmail(SAMPLE), to });
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const to = process.argv[2] ?? 'test@localhost';
  const url = `http://localhost:${process.env.MAILPIT_PORT ?? 8025}`;
  sendTestEmail(to)
    .then(() => console.log(createI18n().t('test_sent', { ns: 'email', to, url })))
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
