import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addEmployee, employee, iso, logIn, logInWithOwnPassword, logOut, next, password } from './helpers';

// Scenariusze z docs/modules/archive/TESTS.md. Konta zakłada test (e2e.tmp.*), projekty mają przedrostek „E2E ”,
// więc sprzątanie po testach usuwa wszystko, co tu powstaje.

test.beforeEach(async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

const ok = async (res: Awaited<ReturnType<Page['request']['post']>>) => {
  expect(res.ok(), await res.text()).toBe(true);
  return res.json() as Promise<{ id: number }>;
};

/** Konto pracownika przez API, od razu w archiwum. */
const archivedAccount = async (page: Page, firstName: string, lastName: string) => {
  const login = `e2e.tmp.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  const { id } = await ok(await page.request.post('/api/employees', {
    data: { firstName, lastName, login, email: '', role: 'employee', password: 'Urlop-2026!', annualDays: 20, carriedDays: 0 },
  }));
  await ok(await page.request.post(`/api/employees/${id}/archive`, { data: {} }));
  return { id, login };
};

/** Projekt „E2E …” z zadaniem w „W toku” i jednym komentarzem; zadanie od razu w archiwum. */
const archivedTask = async (page: Page, title: string) => {
  const project = await ok(await page.request.post('/api/tasks/projects', { data: { name: `E2E Archiwum ${Date.now()}`, memberIds: [] } }));
  const task = await ok(await page.request.post(`/api/tasks/projects/${project.id}/tasks`, {
    data: { title, description: 'Ustalić ceny na 2027 r.', dueDate: null, column: 'in_progress', assigneeIds: [] },
  }));
  await ok(await page.request.post(`/api/tasks/${task.id}/comments`, { data: { text: 'Przesuwamy na grudzień.' } }));
  await ok(await page.request.post(`/api/tasks/${task.id}/archive`, { data: {} }));
  return { projectId: project.id, taskId: task.id };
};

const row = (page: Page, text: string) => page.getByRole('row', { name: new RegExp(text) });

test('administrator przywraca i usuwa na stałe konto z archiwum', async ({ page }) => {
  const lastName = `Archiwalna${String(Date.now()).slice(-6)}`;
  const { id, login } = await archivedAccount(page, 'Olga', lastName);
  await page.goto('/admin/archive');
  await page.getByPlaceholder('Szukaj po imieniu, nazwisku albo loginie').fill(login);
  await expect(page).toHaveURL(/search=/);
  await expect(row(page, lastName)).toContainText('bez wniosków urlopowych');
  await expect(row(page, lastName)).toContainText('przeniósł(a): Test Administrator');

  await row(page, lastName).getByRole('button', { name: 'Przywróć' }).click();
  await page.getByRole('dialog', { name: 'Przywrócić konto?' }).getByRole('button', { name: 'Przywróć' }).click();
  await expect(page.getByText(`Przywrócono konto: Olga ${lastName}.`)).toBeVisible();
  await expect(row(page, lastName)).toHaveCount(0);

  await ok(await page.request.post(`/api/employees/${id}/archive`, { data: {} }));
  await page.reload();
  await row(page, lastName).getByRole('button', { name: 'Usuń na stałe' }).click();
  const dialog = page.getByRole('dialog', { name: 'Usunąć konto na stałe?' });
  const confirm = dialog.getByRole('button', { name: 'Usuń na stałe' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Wpisz imię i nazwisko, żeby potwierdzić').fill('Olga');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Wpisz imię i nazwisko, żeby potwierdzić').fill(`Olga ${lastName}`);
  await confirm.click();
  await expect(page.getByText(`Usunięto na stałe: Olga ${lastName}.`)).toBeVisible();
  await expect(row(page, lastName)).toHaveCount(0);
  expect((await page.request.get(`/api/employees?search=${encodeURIComponent(login)}`)).ok()).toBe(true);
  expect(((await (await page.request.get(`/api/employees?search=${encodeURIComponent(login)}`)).json()) as { total: number }).total).toBe(0);
});

test('osoba z wnioskami urlopowymi nie ma „Usuń na stałe”', async ({ page, browser }) => {
  const lastName = `Urlopowa${String(Date.now()).slice(-6)}`;
  const { page: anna, login } = await employee(page, browser, 'Anna', lastName);
  const overview = (await (await anna.request.get('/api/my-leave/overview')).json()) as { types: { id: number; deductsPool: boolean; yearlyLimit: number | null }[] };
  const vacation = overview.types.find((t) => t.deductsPool && t.yearlyLimit === null)!;
  const day = next(1, 7);
  const request = await ok(await anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(day), dateTo: iso(day) } }));
  await ok(await anna.request.post(`/api/my-leave/requests/${request.id}/withdraw`, { data: {} }));
  const people = (await (await page.request.get(`/api/employees?search=${encodeURIComponent(login)}`)).json()) as { items: { id: number }[] };
  await ok(await page.request.post(`/api/employees/${people.items[0]!.id}/archive`, { data: {} }));

  await page.goto(`/admin/archive?search=${encodeURIComponent(login)}`);
  await expect(row(page, lastName)).toContainText('1 wniosek urlopowy');
  await expect(row(page, lastName).getByRole('button', { name: 'Usuń na stałe' })).toBeDisabled();
  const res = await page.request.delete(`/api/archive/employees/${people.items[0]!.id}`, { data: { confirmName: `Anna ${lastName}` } });
  expect(res.status()).toBe(409);
});

test('administrator filtruje, ogląda, przywraca i usuwa zadanie z archiwum', async ({ page }) => {
  const title = `Spotkanie ${String(Date.now()).slice(-6)}`;
  const { projectId, taskId } = await archivedTask(page, title);
  await archivedTask(page, `${title} inne`);
  await page.goto('/admin/archive');
  await page.getByRole('tab', { name: /^Zadania/ }).click();
  await page.getByPlaceholder('Szukaj zadania').fill(title);
  await expect(row(page, `${title} inne`)).toBeVisible();
  await page.getByRole('combobox', { name: 'Projekt' }).click();
  const projectName = ((await (await page.request.get(`/api/archive/tasks/${taskId}`)).json()) as { projectName: string }).projectName;
  await page.getByRole('option', { name: projectName }).click();
  await expect(page).toHaveURL(new RegExp(`projectId=${projectId}`));
  await expect(row(page, `${title} inne`)).toHaveCount(0);
  await expect(row(page, title)).toContainText('1 komentarz');
  await expect(row(page, title)).toContainText('W toku');

  await row(page, title).getByText(title).click();
  const drawer = page.getByRole('dialog', { name: 'Zadanie w archiwum' });
  await expect(drawer.getByText('Ustalić ceny na 2027 r.')).toBeVisible();
  await expect(drawer.getByText('Przesuwamy na grudzień.')).toBeVisible();
  await drawer.getByRole('button', { name: 'Przywróć' }).click();
  const restore = page.getByRole('dialog', { name: 'Przywrócić zadanie?' });
  await expect(restore).toContainText('na koniec kolumny „W toku”');
  await restore.getByRole('button', { name: 'Przywróć' }).click();
  await expect(page.getByText(`Przywrócono zadanie „${title}”.`)).toBeVisible();
  const board = (await (await page.request.get(`/api/tasks/projects/${projectId}/board`)).json()) as { tasks: { id: number; column: string }[] };
  const inProgress = board.tasks.filter((t) => t.column === 'in_progress');
  expect(inProgress.at(-1)?.id).toBe(taskId);

  await ok(await page.request.post(`/api/tasks/${taskId}/archive`, { data: {} }));
  await page.reload();
  await row(page, title).getByRole('button', { name: 'Usuń na stałe' }).click();
  const remove = page.getByRole('dialog', { name: 'Usunąć zadanie na stałe?' });
  await expect(remove).toContainText('Razem z nim znikną 1 komentarz.');
  await remove.getByRole('button', { name: 'Usuń na stałe' }).click();
  await expect(page.getByText(`Usunięto na stałe zadanie „${title}”.`)).toBeVisible();
  await expect(row(page, title)).toHaveCount(0);
});

test('Historia zmian otwiera zadanie w archiwum', async ({ page }) => {
  const title = `Historia ${String(Date.now()).slice(-6)}`;
  const { taskId } = await archivedTask(page, title);
  await page.goto(`/admin/activity-log?search=${encodeURIComponent(title)}`);
  await page.getByRole('button', { name: /Usunięcie zadania \(do archiwum\)/ }).first().click();
  await page.getByRole('link', { name: 'Otwórz w archiwum' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/archive\\?tab=tasks&taskId=${taskId}`));
  await expect(page.getByRole('dialog', { name: 'Zadanie w archiwum' }).getByText('Ustalić ceny na 2027 r.')).toBeVisible();
});

test('pracownik nie ma dostępu do archiwum', async ({ page }) => {
  const { login, temporary } = await addEmployee(page, 'Ela Bez');
  await logOut(page);
  await logInWithOwnPassword(page, login, temporary);
  await expect(page.getByRole('link', { name: 'Archiwum' })).toHaveCount(0);
  await page.goto('/admin/archive');
  await expect(page.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
});
