import { describe, it } from 'vitest';

describe('DashboardPage', () => {
  it.todo('header: "Pulpit" and "Dziś <weekday>, DD.MM.RRRR"');
  it.todo('loading and server error through DataState');
  it.todo('admin: pending requests with count badge, "zaczyna się …" texts, link to details');
  it.todo('admin: no pending → "Wszystkie wnioski są rozpatrzone…"');
  it.todo('admin: absence strip with "Dziś nie ma: …" from approved only; nobody → empty text');
  it.todo('admin: projects table with overdue in red, links to boards; overdue tasks with people');
  it.todo('admin: no projects → "Nie ma jeszcze projektów…"');
  it.todo('my tasks: due "dziś"/"jutro"/"bez terminu", "i jeszcze N zadań", link opens task on the board');
  it.todo('employee: pool card with "Złóż wniosek" to /admin/my-leave; no pool → text without button');
  it.todo('employee: my requests (pending and next approved) with empty texts');
  it.todo('employee: no admin boxes');
});
