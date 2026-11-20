import {
  DASHBOARD_ABSENCE_DAYS,
  DASHBOARD_BOX_LIMIT,
  ISO_DATE_FORMAT,
  TASK_HIDE_DONE_AFTER_DAYS,
  dayjs,
  todayIsoDate,
  type DashboardResponse,
} from '@app/shared';
import { pool } from '../../db/pool';
import type { Viewer } from '../../middleware/routeHelpers';
import { listAbsences, listPendingForDashboard } from '../leave-requests/leave-requests.queries';
import { listUpcomingOwn } from '../my-leave/my-leave.queries';
import { getMyLeaveOverview } from '../my-leave/my-leave.service';
import { listMyOpenTasks, listOverdueTasks, projectTaskCounts } from '../tasks/tasks.queries';

/**
 * Pulpit zalogowanej osoby. Administrator: wnioski czekające, nieobecności na 2 tygodnie, stan tablic, zadania po
 * terminie, swoje zadania. Pracownik: tylko własne dane (pula, swoje wnioski, swoje zadania). Dane innych modułów
 * wyłącznie przez ich funkcje; „dziś” w strefie aplikacji.
 */
export const getDashboard = async (viewer: Viewer): Promise<DashboardResponse> => {
  const today = todayIsoDate();
  if (viewer.role === 'admin') {
    const until = dayjs(today).add(DASHBOARD_ABSENCE_DAYS - 1, 'day').format(ISO_DATE_FORMAT);
    // Ta sama granica „zrealizowane w ostatnich 30 dniach” co na tablicy projektu.
    const doneSince = dayjs().utc().subtract(TASK_HIDE_DONE_AFTER_DAYS, 'day').toDate();
    const [pending, absences, projects, overdue, myTasks] = await Promise.all([
      listPendingForDashboard(pool, DASHBOARD_BOX_LIMIT),
      listAbsences(pool, today, until),
      projectTaskCounts(pool, today, doneSince),
      listOverdueTasks(pool, today, DASHBOARD_BOX_LIMIT),
      listMyOpenTasks(pool, viewer, DASHBOARD_BOX_LIMIT),
    ]);
    return { role: 'admin', today, pending, absences, projects, overdue, myTasks };
  }

  const [overview, own, myTasks] = await Promise.all([
    getMyLeaveOverview(viewer.id),
    listUpcomingOwn(pool, viewer.id, today),
    listMyOpenTasks(pool, viewer, DASHBOARD_BOX_LIMIT),
  ]);
  return { role: 'employee', today, pool: overview?.pool ?? null, myPending: own.pending, nextLeave: own.nextApproved, myTasks };
};
