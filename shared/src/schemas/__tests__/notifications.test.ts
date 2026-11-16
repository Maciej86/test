import { describe, expect, it } from 'vitest';
import { isPanelLink, notificationsQuerySchema } from '../notifications';
import { NOTIFICATION_TYPES, NOTIFICATION_KEEP_DAYS, NOTIFICATION_BELL_LIMIT } from '../../constants/notifications';
import pl from '../../../locales/pl/notifications.json';
import validation from '../../../locales/pl/validation.json';

describe('notificationsQuerySchema', () => {
  it('no parameters → page 1, unread 0', () => {
    expect(notificationsQuerySchema.parse({})).toEqual({ page: 1, unread: '0' });
  });

  it('page=abc → page 1', () => {
    expect(notificationsQuerySchema.parse({ page: 'abc', unread: '1' })).toEqual({ page: 1, unread: '1' });
    expect(notificationsQuerySchema.parse({ page: '3' }).page).toBe(3);
    // Próba nadużycia: liczba poza zakresem bezpiecznych liczb całkowitych → pierwsza strona, nie błąd bazy.
    expect(notificationsQuerySchema.parse({ page: '99999999999999999999' }).page).toBe(1);
    expect(notificationsQuerySchema.parse({ page: '-3' }).page).toBe(1);
  });

  it('unread=2 → error', () => {
    const result = notificationsQuerySchema.safeParse({ unread: '2' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('validation.list_filter');
    expect(validation.list_filter).toBeTruthy();
  });
});

describe('notification constants', () => {
  it('every type has a title and detail text, values from the spec', () => {
    for (const type of NOTIFICATION_TYPES) {
      expect(pl.types[type].title).toBeTruthy();
      expect(pl.types[type].detail).toBeTruthy();
    }
    expect(NOTIFICATION_KEEP_DAYS).toBe(90);
    expect(NOTIFICATION_BELL_LIMIT).toBe(8);
  });
});

describe('isPanelLink', () => {
  it('only links inside /admin/, never to another server', () => {
    expect(isPanelLink('/admin/tasks')).toBe(true);
    for (const link of [null, '/login', 'https://evil.example/admin/', '//evil.example', '/admin//evil.example', 'javascript:alert(1)']) {
      expect(isPanelLink(link)).toBe(false);
    }
  });
});
