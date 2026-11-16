import { z } from 'zod';
import type { NotificationType } from '../constants/notifications';
import type { ListResponse } from './list';

/** Parametry strony „Powiadomienia” z adresu: `?page=2&unread=1` (front i GET /api/notifications). */
export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  unread: z.enum(['0', '1'], { error: 'validation.list_filter' }).default('0'),
});

export type NotificationsQuery = z.output<typeof notificationsQuerySchema>;

/** Jedno powiadomienie z API. Daty w `params` jako RRRR-MM-DD. */
export interface NotificationItem {
  id: number;
  type: NotificationType;
  params: Record<string, string | number>;
  actorName: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** Dzwonek (GET /api/notifications/summary). */
export interface NotificationsSummary {
  unread: number;
  latest: NotificationItem[];
}

/** Strona „Powiadomienia” (GET /api/notifications). */
export type NotificationsListResponse = ListResponse<NotificationItem> & { unread: number };
