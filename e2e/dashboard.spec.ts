import { expect, test, type Page } from '@playwright/test';
import { ADMIN, DAY, employee, iso, logIn, next, password, todayUtc, typed } from './helpers';

// Scenariusze z docs/modules/dashboard/TESTS.md. Pracownika zakłada test (e2e.tmp.*, pula 20 dni), projekt
// „E2E Pulpit …” test usuwa na końcu. Liczby na Pulpicie administratora zależą od innych danych w bazie, więc test
// sprawdza tylko swoje wiersze.

const card = (page: Page, title: string | RegExp) => page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: title }) });

test('pracownik składa wniosek, administrator widzi go na Pulpicie i zatwierdza, pracownik widzi najbliższy urlop', async ({ page, browser }) => {
  test.setTimeout(90_000);
  const monday = next(1, 2);
  const tuesday = new Date(monday.getTime() + DAY);
  test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const lastName = `Pulpitowa${String.fromCharCode(97 + Math.floor(Math.random() * 26))}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
  const name = `Ola ${lastName}`;
  const { page: ola } = await employee(page, browser, 'Ola', lastName);

  // Pracownik: pula, brak wniosków, bez boksów administratora.
  await expect(card(ola, 'Urlop w ' + todayUtc().getUTCFullYear())).toContainText('dni do wykorzystania (z 20)');
  await expect(ola.getByText('Żaden wniosek nie czeka na decyzję.')).toBeVisible();
  await expect(ola.getByRole('heading', { name: 'Moje zadania' })).toBeVisible();
  await expect(ola.getByRole('heading', { name: /Wnioski do rozpatrzenia/ })).toHaveCount(0);
  await expect(ola.getByRole('heading', { name: 'Nieobecności w najbliższych 2 tygodniach' })).toHaveCount(0);
  await expect(ola.getByRole('heading', { name: 'Stan tablic' })).toHaveCount(0);

  // „Złóż wniosek” prowadzi do Moich urlopów; wniosek na poniedziałek i wtorek.
  await ola.getByRole('link', { name: 'Złóż wniosek' }).click();
  await expect(ola).toHaveURL(/\/admin\/my-leave$/);
  await ola.getByRole('button', { name: 'Złóż wniosek' }).first().click();
  const dialog = ola.getByRole('dialog', { name: 'Złóż wniosek' });
  await dialog.getByRole('textbox', { name: /^Od/ }).fill(typed(monday));
  await dialog.getByRole('textbox', { name: /^Do/ }).fill(typed(tuesday));
  await dialog.getByRole('textbox', { name: /^Do/ }).blur();
  await dialog.getByRole('button', { name: 'Złóż wniosek' }).click();
  await expect(ola.getByText('Wniosek złożony. Administrator dostał powiadomienie.')).toBeVisible();

  await ola.getByRole('link', { name: 'Pulpit' }).click();
  await expect(card(ola, 'Moje wnioski')).toContainText(`${typed(monday)} – ${typed(tuesday)}`);
  await expect(card(ola, 'Moje wnioski').locator('.mantine-Badge-label', { hasText: 'Czeka na decyzję' })).toBeVisible();
  await expect(card(ola, 'Urlop w ' + todayUtc().getUTCFullYear()).locator('[data-left]')).toHaveText('18');

  // Administrator: wniosek na pasku nieobecności (żółty) i w boksie wniosków (gdy mieści się w pierwszych 5).
  await page.goto('/admin');
  const strip = card(page, 'Nieobecności w najbliższych 2 tygodniach');
  const row = strip.locator(`[data-testid="strip-row"][data-name="${name}"]`);
  await expect(row.locator(`[data-mark="pending"]`).first()).toBeVisible();
  const requests = (await (await ola.request.get('/api/my-leave/requests')).json()) as { items: { id: number }[] };
  const id = requests.items[0]!.id;
  const pendingLink = card(page, /Wnioski do rozpatrzenia/).getByRole('link', { name: new RegExp(name) });
  if (await pendingLink.count()) {
    await expect(pendingLink).toContainText('zaczyna się');
    await pendingLink.click();
    await expect(page).toHaveURL(new RegExp(`/admin/leave-requests/${id}$`));
  }
  expect((await page.request.post(`/api/leave-requests/${id}/approve`)).status()).toBe(200);

  await page.goto('/admin');
  await expect(row.locator(`[data-mark="approved"]`).first()).toBeVisible();
  await expect(card(page, /Wnioski do rozpatrzenia/).getByRole('link', { name: new RegExp(name) })).toHaveCount(0);

  // Pracownik: zatwierdzony urlop jako najbliższy.
  await ola.reload();
  const mine = card(ola, 'Moje wnioski');
  await expect(mine).toContainText('Żaden wniosek nie czeka na decyzję.');
  await expect(mine).toContainText(`${typed(monday)} – ${typed(tuesday)}`);
  await expect(mine.getByText('2 dni')).toBeVisible();
});

test('administrator: stan tablic i moje zadanie otwiera podgląd na tablicy', async ({ page }) => {
  test.setTimeout(60_000);
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { user: me } = (await (await page.request.get('/api/auth/me')).json()) as { user: { id: number } };
  const projectName = `E2E Pulpit ${String(Date.now()).slice(-6)}`;
  const project = (await (await page.request.post('/api/tasks/projects', { data: { name: projectName, memberIds: [] } })).json()) as { id: number };
  // Jutro według UTC to w Warszawie dziś albo jutro: termin zawsze dozwolony i zawsze „dziś”/„jutro” na Pulpicie.
  const due = iso(new Date(todayUtc().getTime() + DAY));
  const created = await page.request.post(`/api/tasks/projects/${project.id}/tasks`, {
    data: { title: 'E2E Zadanie z Pulpitu', description: '', dueDate: due, column: 'in_progress', assigneeIds: [String(me.id)] },
  });
  expect(created.status(), await created.text()).toBe(201);
  const task = (await created.json()) as { id: number };

  try {
    await page.goto('/admin');
    const boards = card(page, 'Stan tablic');
    const projectRow = boards.getByRole('row', { name: new RegExp(projectName) });
    await expect(projectRow.getByRole('cell')).toHaveText([projectName, '0', '1', '0', '0']);

    const mine = card(page, 'Moje zadania');
    const taskLink = mine.getByRole('link', { name: /E2E Zadanie z Pulpitu/ });
    await expect(taskLink).toContainText(/dziś|jutro/);
    await taskLink.click();
    await expect(page).toHaveURL(new RegExp(`/admin/tasks/${project.id}\\?task=${task.id}$`));
    await expect(page.getByRole('dialog').getByRole('textbox', { name: /^Tytuł/ })).toHaveValue('E2E Zadanie z Pulpitu');

    await page.goto('/admin');
    await card(page, 'Stan tablic').getByRole('link', { name: projectName }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/tasks/${project.id}$`));
  } finally {
    await page.request.delete(`/api/tasks/projects/${project.id}`, { data: { confirmName: projectName } });
  }
});
