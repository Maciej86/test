import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addEmployee, logIn, logInWithOwnPassword, logOut, password } from './helpers';

// Dane z przedrostkiem „E2E ” sprząta global-teardown.ts; wpisy historii zostają (historia jest trwała).
const entry = (page: Page, text: string | RegExp) => page.locator('main button[aria-expanded]', { hasText: text });

const openLog = async (page: Page, search: string) => {
  await page.goto(`/admin/activity-log?search=${encodeURIComponent(search)}`);
  await expect(page.getByRole('heading', { name: 'Historia zmian' })).toBeVisible();
};

test.describe('administrator', () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  });

  test('dodanie i ukrycie typu urlopu pojawia się w historii z „Otwórz typy urlopów”', async ({ page }) => {
    const name = `E2E Historia ${Date.now()}`;
    const created = await page.request.post('/api/leave-types', { data: { name, deductsPool: true, yearlyLimit: null, color: 'green', dayCount: 'working', requiresApproval: true } });
    expect(created.status()).toBe(201);
    const { id } = (await created.json()) as { id: number };
    expect((await page.request.post(`/api/leave-types/${id}/hide`)).status()).toBe(200);

    await openLog(page, name);
    await expect(page.getByText('2 wpisy').first()).toBeVisible();
    await expect(entry(page, 'Ukrycie typu urlopu')).toContainText(name);
    const added = entry(page, 'Nowy typ urlopu');
    await expect(added).toContainText('Test Administrator');
    await added.click();
    await expect(added).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Odejmuje dni z puli')).toBeVisible();
    await page.getByRole('link', { name: 'Otwórz typy urlopów' }).click();
    await expect(page).toHaveURL(/\/admin\/leave-types$/);
  });

  test('przeniesienie zadania do innej kolumny daje wpis z „Otwórz zadanie”; przesunięcie w kolumnie nie', async ({ page }) => {
    const suffix = String(Date.now()).slice(-6);
    const projectName = `E2E Historia projekt ${suffix}`;
    const title = `Zadanie historii ${suffix}`;
    const project = (await (await page.request.post('/api/tasks/projects', { data: { name: projectName, memberIds: [] } })).json()) as { id: number };
    const task = (await (await page.request.post(`/api/tasks/projects/${project.id}/tasks`, {
      data: { title, description: '', dueDate: '', column: 'draft', assigneeIds: [] },
    })).json()) as { id: number };
    expect((await page.request.post(`/api/tasks/${task.id}/move`, { data: { column: 'done', beforeTaskId: null } })).status()).toBe(200);
    expect((await page.request.post(`/api/tasks/${task.id}/move`, { data: { column: 'done', beforeTaskId: null } })).status()).toBe(200);

    await openLog(page, title);
    await expect(entry(page, 'Przeniesienie zadania')).toHaveCount(1);
    await expect(entry(page, 'Nowe zadanie')).toContainText(`projekt ${projectName}`);
    const moved = entry(page, 'Przeniesienie zadania');
    await moved.click();
    const details = moved.locator('xpath=..');
    await expect(details.getByText('W opracowaniu', { exact: true })).toBeVisible();
    await expect(details.getByText('Zrealizowane', { exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Otwórz zadanie' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/tasks/${project.id}\\?task=${task.id}$`));
    await expect(page.getByText(`Zadanie: ${projectName}`)).toBeVisible();

    // Projekt usunięty na stałe: wpisy zostają z zapamiętaną nazwą i plakietką, bez „Otwórz”.
    expect((await page.request.delete(`/api/tasks/projects/${project.id}`, { data: { confirmName: projectName } })).status()).toBe(200);
    await openLog(page, projectName);
    const deleted = entry(page, 'Usunięcie projektu na stałe');
    await expect(deleted).toContainText(projectName);
    await expect(deleted).toContainText('usunięty na stałe');
    await deleted.click();
    await expect(page.getByText('Nazwa zapamiętana w chwili zmiany, rekordu już nie ma.').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /^Otwórz/ })).toHaveCount(0);
  });

  test('filtry: wyszukiwarka, obszar, osoba, daty, zostają po odświeżeniu; zła kolejność dat i brak wyników', async ({ page }) => {
    const name = `E2E Filtry ${Date.now()}`;
    await page.request.post('/api/contract-types', { data: { name } });
    await page.goto('/admin/activity-log');
    await page.getByPlaceholder('Szukaj nazwy lub osoby').fill(name);
    await page.getByRole('combobox', { name: 'Obszar' }).click();
    await page.getByRole('option', { name: 'Typy umów' }).click();
    await page.getByRole('combobox', { name: 'Kto zmienił' }).click();
    await page.getByRole('option', { name: 'Test Administrator' }).click();
    const today = new Intl.DateTimeFormat('pl-PL', { timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
    await page.getByRole('textbox', { name: 'Od dnia' }).fill(today);
    await page.getByRole('textbox', { name: 'Do dnia' }).fill(today);
    await page.getByRole('heading', { name: 'Historia zmian' }).click();
    // Wyszukiwanie dochodzi do adresu po 300 ms, już po wyborze obszaru i osoby; żaden filtr nie może zniknąć.
    await expect(page).toHaveURL(/search=E2E/);
    await expect(page).toHaveURL(/area=contract_types/);
    await expect(page).toHaveURL(/userId=\d+/);
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=/);
    await expect(entry(page, 'Nowy typ umowy')).toHaveCount(1);
    await expect(entry(page, 'Nowy typ umowy')).toContainText(name);
    await expect(page.getByText('1 wpis').first()).toBeVisible();

    await page.reload();
    await expect(entry(page, 'Nowy typ umowy')).toContainText(name);
    await expect(page.getByRole('combobox', { name: 'Obszar' })).toHaveValue('Typy umów');

    await page.getByRole('textbox', { name: 'Od dnia' }).fill('01.01.2020');
    await page.getByRole('textbox', { name: 'Do dnia' }).fill('31.12.2019');
    await page.getByRole('heading', { name: 'Historia zmian' }).click();
    await expect(page.getByText('Data „do” nie może być wcześniejsza niż „od”.')).toBeVisible();

    await page.goto('/admin/activity-log?from=2020-01-01&to=2020-01-31');
    await expect(page.getByText(/Żaden wpis nie pasuje do filtrów/)).toBeVisible();
    await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
    await expect(page).toHaveURL(/\/admin\/activity-log$/);
    await expect(entry(page, /./).first()).toBeVisible();
  });

  test('telefon: filtry jeden pod drugim, bez przewijania w bok', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/activity-log');
    await expect(entry(page, /./).first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test('pracownik nie ma dostępu do historii', async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { login, temporary } = await addEmployee(page, 'Ola Historia');
  await logOut(page);
  await logInWithOwnPassword(page, login, temporary);
  await expect(page.getByRole('link', { name: 'Historia zmian' })).toHaveCount(0);
  expect((await page.request.get('/api/activity-log')).status()).toBe(403);
  await page.goto('/admin/activity-log');
  await expect(page.getByRole('heading', { name: 'Historia zmian' })).toHaveCount(0);
});
