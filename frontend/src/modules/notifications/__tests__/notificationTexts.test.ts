import { createI18n, type NotificationItem } from '@app/shared';
import type { TFunction } from 'i18next';
import { notificationTexts } from '../notificationTexts';

const t = createI18n().getFixedT('pl', 'notifications') as TFunction<'notifications'>;
const item = (o: Partial<NotificationItem>): NotificationItem => ({
  id: 1,
  type: 'leave_request_new',
  params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-12', days: 5, dayCount: 'working' },
  actorName: 'Jan Kowalski',
  link: '/admin/leave-requests/1',
  readAt: null,
  createdAt: '2026-11-17T08:00:00.000Z',
  ...o,
});

describe('notificationTexts: days with their unit', () => {
  it('new request in working days', () => {
    expect(notificationTexts(item({}), t)).toEqual({ title: 'Nowy wniosek: Jan Kowalski', detail: 'Wypoczynkowy, 08.02.2027 – 12.02.2027, 5 dni roboczych' });
  });

  it('old notification without dayCount counts working days', () => {
    const old = item({ params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '2027-02-08', dateTo: '2027-02-09', days: 2 } });
    expect(notificationTexts(old, t).detail).toBe('Wypoczynkowy, 08.02.2027 – 09.02.2027, 2 dni robocze');
  });

  it('absence reported (type without approval) in calendar days', () => {
    const sick = item({
      type: 'leave_absence_reported',
      params: { employee: 'Tomasz Wójcik', leaveType: 'Chorobowe', dateFrom: '2026-11-16', dateTo: '2026-11-22', days: 7, dayCount: 'calendar' },
    });
    expect(notificationTexts(sick, t)).toEqual({ title: 'Zgłoszona nieobecność: Tomasz Wójcik', detail: 'Chorobowe, 16.11.2026 – 22.11.2026, 7 dni kalendarzowych' });
  });
});
