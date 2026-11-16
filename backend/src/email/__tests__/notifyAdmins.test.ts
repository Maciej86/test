import { afterEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { EmailMessage } from '../sendEmail';
import type { NewLeaveRequestEmailData } from '../templates/newLeaveRequest';

vi.mock('../../db/pool', () => ({ pool: { query: vi.fn() } }));
const { emailAdminsAboutNewRequest } = await import('../notifyAdmins');

const data: NewLeaveRequestEmailData = {
  requestId: 128,
  employeeName: 'Jan Kowalski',
  leaveTypeName: 'Wypoczynkowy',
  dateFrom: '2027-02-08',
  dateTo: '2027-02-12',
  workingDays: 5,
  daysFromCarried: 3,
  daysFromAnnual: 2,
  leftAfter: 24,
  comment: null,
};

const admins = [
  { name: 'Anna Nowak', email: 'anna.nowak@firma.pl' },
  { name: 'Piotr Zieliński', email: 'piotr@firma.pl' },
];

type SendEmail = (message: EmailMessage) => Promise<unknown>;

const deps = (over: { listAdminEmails?: () => Promise<typeof admins>; sendEmail?: Mock<SendEmail> } = {}) => ({
  listAdminEmails: over.listAdminEmails ?? vi.fn(async () => admins),
  sendEmail: over.sendEmail ?? vi.fn<SendEmail>(async () => ({})),
});

describe('emailAdminsAboutNewRequest', () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  afterEach(() => log.mockClear());

  it('sends a separate email to each admin', async () => {
    const d = deps();
    expect(await emailAdminsAboutNewRequest(data, d)).toBe(2);
    expect(d.sendEmail.mock.calls.map((c) => c[0].to)).toEqual(['anna.nowak@firma.pl', 'piotr@firma.pl']);
    expect(d.sendEmail.mock.calls[0]![0].subject).toBe('Nowy wniosek urlopowy: Jan Kowalski, 08.02.2027–12.02.2027');
  });

  it('a failing recipient does not stop the others and does not throw', async () => {
    const sendEmail = vi.fn<SendEmail>().mockRejectedValueOnce(new Error('SMTP down')).mockResolvedValueOnce({});
    const d = deps({ sendEmail });
    expect(await emailAdminsAboutNewRequest(data, d)).toBe(1);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith('email failed', { requestId: 128, to: 'anna.nowak@firma.pl' }, expect.any(Error));
  });

  it('no admins with an email → nothing sent, returns 0', async () => {
    const d = deps({ listAdminEmails: async () => [] });
    expect(await emailAdminsAboutNewRequest(data, d)).toBe(0);
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('a database error is logged and returns 0', async () => {
    const d = deps({ listAdminEmails: async () => Promise.reject(new Error('db down')) });
    expect(await emailAdminsAboutNewRequest(data, d)).toBe(0);
    expect(d.sendEmail).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('email failed', { requestId: 128 }, expect.any(Error));
  });
});
