import { useSyncExternalStore } from 'react';
import type { Role } from '@app/shared';

export type NotificationType =
  | 'leave_request_new'
  | 'leave_absence_reported'
  | 'leave_request_withdrawn'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'task_assigned';

export interface MockNotification {
  id: number;
  type: NotificationType;
  /** Wartości do tekstu (klucz `types.<type>.title` / `detail` w notifications.json). */
  params: Record<string, string | number>;
  /** Kto wykonał czynność (w aplikacji: zapisane imię i nazwisko, zostaje po usunięciu osoby). */
  actor: string;
  /** Dokąd prowadzi kliknięcie. */
  link: string;
  createdAt: Date;
  read: boolean;
}

const MINUTE = 60_000;
const ago = (minutes: number): Date => new Date(Date.now() - minutes * MINUTE);
const DAY = 24 * 60;

/** Administrator: nowe i wycofane wnioski oraz zgłoszone nieobecności (spec ogólny, „Zasady wspólne”). */
const ADMIN: MockNotification[] = [
  { id: 7, type: 'leave_absence_reported', params: { employee: 'Tomasz Wójcik', leaveType: 'Chorobowe', dateFrom: '16.11.2026', dateTo: '22.11.2026', days: 7, dayCount: 'calendar' }, actor: 'Tomasz Wójcik', link: '/admin/leave-requests', createdAt: ago(5), read: false },
  { id: 1, type: 'leave_request_new', params: { employee: 'Jan Kowalski', leaveType: 'Wypoczynkowy', dateFrom: '08.02.2027', dateTo: '12.02.2027', days: 5 }, actor: 'Jan Kowalski', link: '/admin/leave-requests', createdAt: ago(12), read: false },
  { id: 2, type: 'leave_request_new', params: { employee: 'Katarzyna Wiśniewska', leaveType: 'Na żądanie', dateFrom: '18.11.2026', dateTo: '18.11.2026', days: 1 }, actor: 'Katarzyna Wiśniewska', link: '/admin/leave-requests', createdAt: ago(95), read: false },
  { id: 3, type: 'leave_request_withdrawn', params: { employee: 'Piotr Zieliński', leaveType: 'Wypoczynkowy', dateFrom: '23.12.2026', dateTo: '31.12.2026' }, actor: 'Piotr Zieliński', link: '/admin/leave-requests', createdAt: ago(DAY + 140), read: false },
  { id: 4, type: 'leave_request_new', params: { employee: 'Piotr Zieliński', leaveType: 'Wypoczynkowy', dateFrom: '23.12.2026', dateTo: '31.12.2026', days: 5 }, actor: 'Piotr Zieliński', link: '/admin/leave-requests', createdAt: ago(DAY + 600), read: true },
  { id: 5, type: 'leave_request_new', params: { employee: 'Magdalena Lewandowska', leaveType: 'Okolicznościowy', dateFrom: '27.11.2026', dateTo: '28.11.2026', days: 2 }, actor: 'Magdalena Lewandowska', link: '/admin/leave-requests', createdAt: ago(4 * DAY + 30), read: true },
  { id: 6, type: 'leave_request_new', params: { employee: 'Tomasz Wójcik', leaveType: 'Wypoczynkowy', dateFrom: '02.01.2027', dateTo: '09.01.2027', days: 5 }, actor: 'Tomasz Wójcik', link: '/admin/leave-requests', createdAt: ago(6 * DAY + 300), read: true },
];

/** Pracownik: decyzje o własnych urlopach i przypisanie do zadania. */
const EMPLOYEE: MockNotification[] = [
  { id: 11, type: 'task_assigned', params: { task: 'Inwentaryzacja magazynu w Poznaniu', dueDate: '20.11.2026' }, actor: 'Anna Nowak', link: '/admin/tasks', createdAt: ago(25), read: false },
  { id: 12, type: 'leave_approved', params: { leaveType: 'Wypoczynkowy', dateFrom: '08.02.2027', dateTo: '12.02.2027' }, actor: 'Anna Nowak', link: '/admin/my-leave', createdAt: ago(180), read: false },
  { id: 13, type: 'leave_rejected', params: { leaveType: 'Na żądanie', dateFrom: '04.12.2026', dateTo: '04.12.2026', reason: 'tego dnia audyt klienta, potrzebna cała ekipa' }, actor: 'Anna Nowak', link: '/admin/my-leave', createdAt: ago(DAY + 60), read: true },
  { id: 14, type: 'task_assigned', params: { task: 'Zamówić tonery do drukarek' }, actor: 'Katarzyna Wiśniewska', link: '/admin/tasks', createdAt: ago(3 * DAY + 200), read: true },
  { id: 15, type: 'leave_cancelled', params: { leaveType: 'Wypoczynkowy', dateFrom: '16.11.2026', dateTo: '17.11.2026' }, actor: 'Anna Nowak', link: '/admin/my-leave', createdAt: ago(9 * DAY), read: true },
];

const initial = (): Record<string, MockNotification[]> => ({ admin: ADMIN.map((n) => ({ ...n })), employee: EMPLOYEE.map((n) => ({ ...n })) });

/** Wspólny stan dzwonka i strony „wszystkie” w makiecie (bez serwera): kliknięcie w dzwonku widać też na stronie. */
let state = initial();
let empty = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const snapshot = () => state;
const emptySnapshot = () => empty;

export const mockNotificationsStore = {
  markRead: (role: Role, id: number) => {
    state = { ...state, [role]: (state[role] ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)) };
    emit();
  },
  markAllRead: (role: Role) => {
    state = { ...state, [role]: (state[role] ?? []).map((n) => ({ ...n, read: true })) };
    emit();
  },
  setEmpty: (value: boolean) => {
    empty = value;
    if (!value) state = initial();
    emit();
  },
};

export const useMockNotifications = (role: Role) => {
  const all = useSyncExternalStore(subscribe, snapshot);
  const isEmpty = useSyncExternalStore(subscribe, emptySnapshot);
  const items = isEmpty ? [] : (all[role] ?? []);
  return { items, isEmpty, unread: items.filter((n) => !n.read).length };
};
