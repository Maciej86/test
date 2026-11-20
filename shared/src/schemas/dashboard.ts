import type { Role } from '../constants/roles';
import type { MyLeaveOverview } from './myLeave';

/** Pulpit tylko pokazuje dane (nic nie przyjmuje), więc są tu same typy odpowiedzi `GET /api/dashboard`. */

/** Lista przycięta do `DASHBOARD_BOX_LIMIT` i liczba wszystkich pozycji. */
export interface DashboardList<T> {
  items: T[];
  total: number;
}

export interface DashboardPendingRequest {
  id: number;
  employeeName: string;
  leaveTypeName: string;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
  createdAt: string;
}

/** Nieobecność na pasku: tylko osoba, daty i status (bez typu urlopu, powodu, komentarza). */
export interface DashboardAbsence {
  userId: number;
  name: string;
  dateFrom: string;
  dateTo: string;
  status: 'approved' | 'pending';
}

export interface DashboardProjectCounts {
  id: number;
  name: string;
  draft: number;
  inProgress: number;
  overdue: number;
  doneRecently: number;
}

export interface DashboardTask {
  id: number;
  title: string;
  projectId: number;
  projectName: string;
  column: 'draft' | 'in_progress';
  dueDate: string | null;
  /** Tylko w „Zadaniach po terminie” administratora. */
  assignees?: { name: string; archived: boolean }[];
}

export interface DashboardOwnRequest {
  id: number;
  leaveTypeName: string;
  dateFrom: string;
  dateTo: string;
  workingDays: number;
}

export interface AdminDashboard {
  role: Extract<Role, 'admin'>;
  today: string;
  pending: DashboardList<DashboardPendingRequest>;
  absences: DashboardAbsence[];
  projects: DashboardProjectCounts[];
  overdue: DashboardList<DashboardTask>;
  myTasks: DashboardList<DashboardTask>;
}

export interface EmployeeDashboard {
  role: Extract<Role, 'employee'>;
  today: string;
  pool: MyLeaveOverview['pool'] | null;
  myPending: DashboardOwnRequest[];
  nextLeave: DashboardOwnRequest | null;
  myTasks: DashboardList<DashboardTask>;
}

export type DashboardResponse = AdminDashboard | EmployeeDashboard;
