import { test } from '@playwright/test';

test.describe('leave requests', () => {
  test.fixme('employee submits, admin opens /admin/leave-requests/<id>, approves in the window, employee gets a notification', () => {});
  test.fixme('admin cancels with a reason, employee sees the reason in "Moje urlopy"', () => {});
  test.fixme('reject without a reason shows an error under the field', () => {});
  test.fixme('employee gets "no access" on /admin/leave-requests', () => {});
});
