import { useNavigate } from 'react-router';
import { isPanelLink, type NotificationItem } from '@app/shared';
import { useMarkRead } from './notifications.api';

/** Kliknięcie powiadomienia: oznacza jako przeczytane i przechodzi pod jego adres (tylko w panelu). */
export const useOpenNotification = (afterOpen?: () => void) => {
  const navigate = useNavigate();
  const markRead = useMarkRead();
  return (n: NotificationItem) => {
    if (n.readAt === null) markRead.mutate(n.id);
    afterOpen?.();
    if (isPanelLink(n.link)) navigate(n.link);
  };
};
