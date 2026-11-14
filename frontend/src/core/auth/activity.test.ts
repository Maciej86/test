import { AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { SESSION_KEEPALIVE_MS, USER_ACTIVITY_HEADER } from '@app/shared';
import { addActivityHeader, sessionRedirect } from '../api/client';
import { announceLogout, lastActivityAt, markActivity, watchLogoutInOtherTabs } from './activity';

const config = () => ({ headers: new AxiosHeaders() }) as InternalAxiosRequestConfig;

describe('activity', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-14T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('adds the activity header only after recent activity', () => {
    markActivity();
    expect(addActivityHeader(config()).headers.get(USER_ACTIVITY_HEADER)).toBe('1');
    vi.advanceTimersByTime(SESSION_KEEPALIVE_MS + 1);
    expect(addActivityHeader(config()).headers.get(USER_ACTIVITY_HEADER)).toBeUndefined();
  });

  it('activity in one tab is seen in another', () => {
    markActivity();
    const later = Date.now() + 5 * 60_000;
    // Druga karta zapisała swoją czynność w tym samym localStorage.
    localStorage.setItem('app.lastActivityAt', String(later));
    expect(lastActivityAt()).toBe(later);
  });

  it('logout in another tab sends this tab to /login', () => {
    const go = vi.spyOn(sessionRedirect, 'go').mockImplementation(() => {});
    const stop = watchLogoutInOtherTabs();
    announceLogout();
    window.dispatchEvent(new StorageEvent('storage', { key: 'app.logoutAt', newValue: String(Date.now()) }));
    expect(go).toHaveBeenCalledWith('/login');
    stop();
    go.mockRestore();
  });
});
