import { expect, test, type Page } from '@playwright/test';
import { ADMIN, employee, logIn, password } from './helpers';

// Scenariusz z docs/modules/tasks/SPEC.md („Moduł działa, gdy”) i TESTS-1.md: administrator zakłada projekt z dwoma
// pracownikami, Piotr dodaje zadanie i przypisuje Jana, Jan dostaje powiadomienie i przenosi kartę do
// „Zrealizowane”, a Piotr widzi to bez odświeżania strony. Na końcu administrator usuwa Jana z projektu (znika
// z otwartego zadania) i usuwa projekt po wpisaniu nazwy.

interface Board {
  tasks: { id: number; title: string; column: string; assigneeIds: number[] }[];
}

const board = async (page: Page, projectId: number) => (await (await page.request.get(`/api/tasks/projects/${projectId}/board`)).json()) as Board;

const pickPerson = async (page: Page, dialog: ReturnType<Page['getByRole']>, name: string) => {
  await dialog.locator('.mantine-MultiSelect-inputField').click();
  await dialog.locator('.mantine-MultiSelect-inputField').fill(name);
  await page.getByRole('option', { name: new RegExp(name) }).click();
  // Lista zostaje otwarta (można wybrać kolejną osobę); kliknięcie w tytuł okna ją zamyka.
  await dialog.locator('.mantine-Modal-title').click();
};

test('projekt, przypisanie, powiadomienie, przeniesienie widoczne u innych, usunięcie z projektu i projektu', async ({ page, browser }) => {
  test.setTimeout(120_000);
  const suffix = String(Date.now()).slice(-6);
  const projectName = `E2E Projekt ${suffix}`;

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: piotr } = await employee(page, browser, 'Piotr', `Tablica${suffix}`);
  const { page: jan } = await employee(page, browser, 'Jan', `Tablica${suffix}`);
  const candidates = (await (await page.request.get('/api/tasks/projects/candidates')).json()) as { id: number; name: string }[];
  const janId = candidates.find((c) => c.name === `Jan Tablica${suffix}`)!.id;

  // Administrator zakłada projekt z dwoma pracownikami.
  await page.goto('/admin/tasks/projects');
  await page.getByRole('button', { name: 'Dodaj projekt' }).first().click();
  const projectDialog = page.getByRole('dialog', { name: 'Dodaj projekt' });
  await projectDialog.getByLabel(/^Nazwa/).fill(projectName);
  await pickPerson(page, projectDialog, `Piotr Tablica${suffix}`);
  await pickPerson(page, projectDialog, `Jan Tablica${suffix}`);
  await projectDialog.getByRole('button', { name: 'Dodaj projekt' }).click();
  await expect(page.getByText('Dodano projekt. Pojawił się w menu „Zadania”.')).toBeVisible();
  const projects = (await (await page.request.get('/api/tasks/projects')).json()) as { items: { id: number; name: string }[] };
  const projectId = projects.items.find((p) => p.name === projectName)!.id;

  // Piotr widzi projekt w menu i dodaje zadanie dla Jana.
  await piotr.reload();
  await piotr.getByRole('button', { name: 'Zadania' }).click();
  await piotr.getByRole('link', { name: projectName }).click();
  await expect(piotr.getByRole('heading', { name: projectName })).toBeVisible();
  await piotr.getByRole('button', { name: 'Dodaj zadanie' }).first().click();
  const taskDialog = piotr.getByRole('dialog', { name: `Nowe zadanie: ${projectName}` });
  await taskDialog.getByLabel(/^Tytuł/).fill('Ab');
  await taskDialog.getByRole('button', { name: 'Dodaj zadanie' }).click();
  await expect(taskDialog.getByText('Za mało znaków.')).toBeVisible();
  await taskDialog.getByLabel(/^Tytuł/).fill('Zamówić ulotki na targi');
  await pickPerson(piotr, taskDialog, `Jan Tablica${suffix}`);
  await taskDialog.getByRole('button', { name: 'Dodaj zadanie' }).click();
  await expect(piotr.getByText('Dodano zadanie. Przypisane osoby dostaną powiadomienie.')).toBeVisible();
  await expect(piotr.getByRole('region', { name: 'W opracowaniu' }).getByText('Zamówić ulotki na targi')).toBeVisible();

  // Jan dostaje powiadomienie; link otwiera tablicę z podglądem zadania.
  await jan.goto('/admin/notifications');
  await jan.getByText('Nowe zadanie dla Ciebie').first().click();
  await expect(jan).toHaveURL(new RegExp(`/admin/tasks/${projectId}\\?task=\\d+`));
  await expect(jan.getByText(`Zadanie: ${projectName}`)).toBeVisible();
  await jan.getByRole('button', { name: 'Anuluj' }).click();

  // Jan przenosi kartę do „Zrealizowane” z menu karty; Piotr widzi to bez odświeżania (≤ 7 s).
  const card = jan.locator('.mantine-Card-root', { hasText: 'Zamówić ulotki na targi' });
  await card.getByRole('button', { name: 'Więcej działań' }).click();
  await jan.getByRole('menuitem', { name: 'Zrealizowane' }).click();
  await expect(jan.getByRole('region', { name: 'Zrealizowane' }).getByText('Zamówić ulotki na targi')).toBeVisible();
  await expect(piotr.getByRole('region', { name: 'Zrealizowane' }).getByText('Zamówić ulotki na targi')).toBeVisible({ timeout: 7_000 });

  // Przeciąganie myszą: nowa karta z „W opracowaniu” do „W toku”.
  const second = await piotr.request.post(`/api/tasks/projects/${projectId}/tasks`, {
    data: { title: 'Rozwiesić plakaty', description: '', dueDate: '', column: 'draft', assigneeIds: [janId] },
  });
  expect(second.status()).toBe(201);
  const secondId = ((await second.json()) as { id: number }).id;
  const draftCard = piotr.locator('.mantine-Card-root', { hasText: 'Rozwiesić plakaty' });
  await expect(draftCard).toBeVisible({ timeout: 7_000 });
  const from = (await draftCard.boundingBox())!;
  const to = (await piotr.getByRole('region', { name: 'W toku' }).boundingBox())!;
  await piotr.mouse.move(from.x + from.width / 2, from.y + 10);
  await piotr.mouse.down();
  await piotr.mouse.move(from.x + from.width / 2 + 20, from.y + 30, { steps: 5 });
  await piotr.mouse.move(to.x + to.width / 2, to.y + to.height - 20, { steps: 15 });
  await piotr.mouse.up();
  await expect(piotr.getByRole('region', { name: 'W toku' }).getByText('Rozwiesić plakaty')).toBeVisible();
  await expect.poll(async () => (await board(page, projectId)).tasks.find((t) => t.id === secondId)?.column).toBe('in_progress');

  // Administrator usuwa Jana z projektu: znika z otwartego zadania, w zrealizowanym zostaje.
  await page.goto('/admin/tasks/projects');
  await page.getByRole('row', { name: new RegExp(projectName) }).getByRole('button', { name: 'Edytuj' }).click();
  const editDialog = page.getByRole('dialog', { name: `Projekt: ${projectName}` });
  await editDialog.locator('.mantine-Pill-root', { hasText: `Jan Tablica${suffix}` }).locator('.mantine-Pill-remove').click();
  await expect(editDialog.getByText(/Jan Tablica\d+ ma 1 otwarte zadanie w tym projekcie/)).toBeVisible();
  await editDialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano projekt.')).toBeVisible();
  const after = await board(page, projectId);
  expect(after.tasks.find((t) => t.id === secondId)!.assigneeIds).not.toContain(janId);
  expect(after.tasks.find((t) => t.title === 'Zamówić ulotki na targi')!.assigneeIds).toContain(janId);

  // Usunięcie projektu na stałe po wpisaniu nazwy.
  await page.getByRole('row', { name: new RegExp(projectName) }).getByRole('button', { name: 'Usuń' }).click();
  const deleteDialog = page.getByRole('dialog', { name: 'Usunąć projekt na stałe?' });
  await expect(deleteDialog.getByRole('button', { name: 'Usuń na stałe' })).toBeDisabled();
  await deleteDialog.getByRole('textbox').fill(projectName);
  await deleteDialog.getByRole('button', { name: 'Usuń na stałe' }).click();
  await expect(page.getByText('Usunięto projekt.')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(projectName) })).toHaveCount(0);
  expect((await page.request.get(`/api/tasks/projects/${projectId}/board`)).status()).toBe(404);
});

// Błąd zgłoszony 2026-11-18: przeciągnięcie karty z „W opracowaniu” na nagłówek „W toku” (z kartą w środku)
// kończyło się „Maximum update depth exceeded”, bo karta skakała na zmianę na koniec kolumny i przed kartę.
test('przeciągnięcie karty na nagłówek innej kolumny: bez błędu, karta trafia do tej kolumny', async ({ page }) => {
  test.setTimeout(90_000);
  // Szerokie okno jak u użytkownika: karty są niskie, a przeciągana karta zahacza jednocześnie o nagłówek i kartę w kolumnie.
  await page.setViewportSize({ width: 2100, height: 1100 });
  const suffix = String(Date.now()).slice(-6);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const name = `E2E Nagłówek ${suffix}`;
  const project = (await (await page.request.post('/api/tasks/projects', { data: { name, memberIds: [] } })).json()) as { id: number };
  const add = (title: string, column: string) =>
    page.request.post(`/api/tasks/projects/${project.id}/tasks`, { data: { title, description: '', dueDate: '', column, assigneeIds: [] } });
  await add('Karta do przeniesienia', 'draft');
  await add('Karta już w toku', 'in_progress');
  await page.goto(`/admin/tasks/${project.id}`);
  const card = page.locator('.mantine-Card-root', { hasText: 'Karta do przeniesienia' });
  const header = page.getByRole('region', { name: 'W toku' }).getByRole('heading', { name: 'W toku' });
  const from = (await card.boundingBox())!;
  const to = (await header.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 10, from.y + 25, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 20 });
  for (let i = 0; i < 20; i++) await page.mouse.move(to.x + to.width / 2 + (i % 2), to.y + to.height / 2);
  await page.mouse.up();
  await expect(page.getByRole('region', { name: 'W toku' }).getByText('Karta do przeniesienia')).toBeVisible();
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0);
  expect(errors.filter((e) => e.includes('Maximum update depth'))).toEqual([]);
  await page.request.delete(`/api/tasks/projects/${project.id}`, { data: { confirmName: name } });
});

// Zgłoszenie 2026-11-18: karta nad kartą w innej kolumnie (szerokie okno) nie zmieniała ramki ani miejsca, bo cel
// wybierała większa część karty, a nie kursor.
test('przeciąganie nad kartę w innej kolumnie: ramka tej kolumny się podświetla, karta trafia przed tę kartę', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 2100, height: 1100 });
  const suffix = String(Date.now()).slice(-6);
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const name = `E2E Ramka ${suffix}`;
  const project = (await (await page.request.post('/api/tasks/projects', { data: { name, memberIds: [] } })).json()) as { id: number };
  const add = (title: string, column: string) =>
    page.request.post(`/api/tasks/projects/${project.id}/tasks`, { data: { title, description: '', dueDate: '', column, assigneeIds: [] } });
  await add('Karta w opracowaniu', 'draft');
  await add('Karta z toku', 'in_progress');
  await page.goto(`/admin/tasks/${project.id}`);
  const moving = page.locator('.mantine-Card-root', { hasText: 'Karta z toku' });
  const target = page.locator('.mantine-Card-root', { hasText: 'Karta w opracowaniu' });
  const from = (await moving.boundingBox())!;
  const to = (await target.boundingBox())!;
  // Chwyt przy lewej krawędzi karty: większa część karty zostaje nad „W toku”, a kursor jest nad kartą w „W opracowaniu”.
  await page.mouse.move(from.x + 30, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 5 });
  await page.mouse.move(to.x + to.width - 60, to.y + 15, { steps: 25 });
  const draft = page.getByRole('region', { name: 'W opracowaniu' });
  await expect(draft).toHaveCSS('outline-style', 'dashed');
  await expect(draft.getByText('Karta z toku')).toBeVisible();
  await page.mouse.up();
  await expect.poll(async () => (await board(page, project.id)).tasks.find((t) => t.title === 'Karta z toku')?.column).toBe('draft');
  await page.request.delete(`/api/tasks/projects/${project.id}`, { data: { confirmName: name } });
});

// Zgłoszenie 2026-11-18: „duch” przeciąganej karty rozciągał się nad kolumną o innej wysokości.
test('przeciągana karta pod kursorem ma rozmiar karty, a w kolumnie zostaje jej zarys', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  const suffix = String(Date.now()).slice(-6);
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const name = `E2E Duch ${suffix}`;
  const project = (await (await page.request.post('/api/tasks/projects', { data: { name, memberIds: [] } })).json()) as { id: number };
  const add = (title: string, column: string, description = '') =>
    page.request.post(`/api/tasks/projects/${project.id}/tasks`, { data: { title, description, dueDate: '', column, assigneeIds: [] } });
  await add('Wysoka karta', 'draft', 'Długi opis, żeby karta była wyższa. '.repeat(4));
  await add('Niska karta', 'in_progress');
  await page.goto(`/admin/tasks/${project.id}`);
  const moving = page.locator('.mantine-Card-root', { hasText: 'Niska karta' });
  const from = (await moving.boundingBox())!;
  const to = (await page.locator('.mantine-Card-root', { hasText: 'Wysoka karta' }).boundingBox())!;
  await page.mouse.move(from.x + 30, from.y + 15);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 30, { steps: 5 });
  await page.mouse.move(to.x + 60, to.y + to.height / 2, { steps: 25 });
  const ghost = page.locator('[data-drag-overlay] .mantine-Card-root');
  await expect(ghost).toBeVisible();
  const box = (await ghost.boundingBox())!;
  expect(Math.abs(box.width - from.width)).toBeLessThan(3);
  expect(Math.abs(box.height - from.height)).toBeLessThan(3);
  await page.mouse.up();
  // Zgłoszenie 2026-11-19: po puszczeniu kopia leciała do starej kolumny. Teraz znika od razu, karta stoi na nowym miejscu.
  await expect(ghost).toHaveCount(0, { timeout: 100 });
  await expect(page.getByRole('region', { name: 'W opracowaniu' }).getByText('Niska karta')).toBeVisible();
  await expect.poll(async () => (await board(page, project.id)).tasks.find((t) => t.title === 'Niska karta')?.column).toBe('draft');
  await page.request.delete(`/api/tasks/projects/${project.id}`, { data: { confirmName: name } });
});

// Próby nadużyć (docs/modules/tasks/TESTS-1.md, „Próby nadużyć”) na prawdziwej bazie: pracownik spoza projektu,
// podrobione pola, zakazane przeniesienia, kilka zapisów naraz, usuwanie i złe dane.
test.describe('abuse', () => {
  const setup = async (page: Page, browser: import('@playwright/test').Browser) => {
    const suffix = String(Date.now()).slice(-6);
    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const member = await employee(page, browser, 'Ala', `Członek${suffix}`);
    const outsider = await employee(page, browser, 'Olek', `Obcy${suffix}`);
    const candidates = (await (await page.request.get('/api/tasks/projects/candidates')).json()) as { id: number; name: string }[];
    const memberId = candidates.find((c) => c.name === `Ala Członek${suffix}`)!.id;
    const outsiderId = candidates.find((c) => c.name === `Olek Obcy${suffix}`)!.id;
    const project = (await (await page.request.post('/api/tasks/projects', { data: { name: `E2E Nadużycia ${suffix}`, memberIds: [memberId] } })).json()) as { id: number };
    const other = (await (await page.request.post('/api/tasks/projects', { data: { name: `E2E Inny ${suffix}`, memberIds: [outsiderId] } })).json()) as { id: number };
    const newTask = async (as: Page, projectId: number, title: string, extra: object = {}) => {
      const res = await as.request.post(`/api/tasks/projects/${projectId}/tasks`, { data: { title, description: '', dueDate: '', column: 'draft', assigneeIds: [], ...extra } });
      expect(res.status()).toBe(201);
      return ((await res.json()) as { id: number }).id;
    };
    const cleanup = async () => {
      for (const p of [project.id, other.id]) {
        const name = p === project.id ? `E2E Nadużycia ${suffix}` : `E2E Inny ${suffix}`;
        await page.request.delete(`/api/tasks/projects/${p}`, { data: { confirmName: name } });
      }
    };
    return { member: member.page, outsider: outsider.page, memberId, outsiderId, projectId: project.id, otherId: other.id, newTask, cleanup };
  };

  test('pracownik spoza projektu: nie widzi go na liście i dostaje 404 na tablicy i każdym zapisie; wyższa rola → 403', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const s = await setup(page, browser);
    const taskId = await s.newTask(s.member, s.projectId, 'Tajne zadanie');
    const list = (await (await s.outsider.request.get('/api/tasks/projects')).json()) as { items: { id: number }[] };
    expect(list.items.map((p) => p.id)).not.toContain(s.projectId);
    expect((await s.outsider.request.get(`/api/tasks/projects/${s.projectId}/board`)).status()).toBe(404);
    const task = { title: 'Przejęte', description: '', dueDate: '', column: 'done', assigneeIds: [s.outsiderId] };
    expect((await s.outsider.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: task })).status()).toBe(404);
    expect((await s.outsider.request.put(`/api/tasks/${taskId}`, { data: task })).status()).toBe(404);
    expect((await s.outsider.request.post(`/api/tasks/${taskId}/move`, { data: { column: 'done', beforeTaskId: null } })).status()).toBe(404);
    expect((await s.outsider.request.post(`/api/tasks/${taskId}/archive`)).status()).toBe(404);
    const after = await board(page, s.projectId);
    expect(after.tasks.find((t) => t.id === taskId)).toMatchObject({ title: 'Tajne zadanie', column: 'draft', assigneeIds: [] });
    // Wyższa rola: projekty zmienia tylko administrator, także gdy pracownik wpisze adres ręcznie.
    expect((await s.member.request.post('/api/tasks/projects', { data: { name: 'Mój projekt', memberIds: [] } })).status()).toBe(403);
    expect((await s.member.request.get('/api/tasks/projects/candidates')).status()).toBe(403);
    expect((await s.member.request.delete(`/api/tasks/projects/${s.projectId}`, { data: { confirmName: 'x' } })).status()).toBe(403);
    await s.member.goto('/admin/tasks/projects');
    await expect(s.member.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
    await s.outsider.goto(`/admin/tasks/${s.projectId}`);
    await expect(s.outsider.getByText('Nie masz dostępu do tego projektu albo projekt został usunięty.')).toBeVisible();
    await s.cleanup();
  });

  test('podrobione pola i zakazane przeniesienia: autor, pozycja i data z serwera; karta z innego projektu → 400', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const s = await setup(page, browser);
    const taskId = await s.newTask(s.member, s.projectId, 'Podrobione pola', { createdBy: 1, createdByName: 'Prezes', position: 99, completedAt: '2020-01-01', projectId: s.otherId });
    const created = (await board(page, s.projectId)).tasks.find((t) => t.id === taskId) as unknown as { createdByName: string; position: number; completedAt: string | null };
    expect(created.createdByName).toMatch(/^Ala Członek/);
    expect(created.position).toBe(1);
    expect(created.completedAt).toBeNull();
    const foreign = await s.newTask(s.outsider, s.otherId, 'Karta z innego projektu');
    expect((await s.member.request.post(`/api/tasks/${taskId}/move`, { data: { column: 'draft', beforeTaskId: foreign } })).status()).toBe(400);
    // Przypisanie osoby spoza projektu i termin w przeszłości → 400 przy polu.
    const outsiderAssigned = await s.member.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: { title: 'Dla obcego', description: '', dueDate: '', column: 'draft', assigneeIds: [s.outsiderId] } });
    expect(outsiderAssigned.status()).toBe(400);
    expect(((await outsiderAssigned.json()) as { error: { fields: Record<string, string> } }).error.fields).toEqual({ assigneeIds: 'tasks.assignee_not_allowed' });
    const past = await s.member.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: { title: 'Wczoraj', description: '', dueDate: '2020-01-01', column: 'draft', assigneeIds: [] } });
    expect(past.status()).toBe(400);
    // Zadanie w archiwum: dalsze zmiany → 404.
    expect((await s.member.request.post(`/api/tasks/${taskId}/archive`)).status()).toBe(200);
    expect((await s.member.request.put(`/api/tasks/${taskId}`, { data: { title: 'Po archiwum', description: '', dueDate: '', column: 'draft', assigneeIds: [] } })).status()).toBe(404);
    expect((await s.member.request.post(`/api/tasks/${taskId}/archive`)).status()).toBe(404);
    await s.cleanup();
  });

  test('kilka przeciągnięć naraz w tej samej kolumnie → wszystkie bez błędu serwera, pozycje 1..n bez powtórzeń', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const s = await setup(page, browser);
    const ids: number[] = [];
    for (const n of [1, 2, 3, 4, 5]) ids.push(await s.newTask(s.member, s.projectId, `Karta ${n}`));
    const moves = await Promise.all([
      s.member.request.post(`/api/tasks/${ids[0]}/move`, { data: { column: 'draft', beforeTaskId: null } }),
      page.request.post(`/api/tasks/${ids[1]}/move`, { data: { column: 'draft', beforeTaskId: null } }),
      s.member.request.post(`/api/tasks/${ids[2]}/move`, { data: { column: 'in_progress', beforeTaskId: null } }),
      page.request.post(`/api/tasks/${ids[3]}/move`, { data: { column: 'in_progress', beforeTaskId: null } }),
      s.member.request.post(`/api/tasks/${ids[4]}/move`, { data: { column: 'draft', beforeTaskId: ids[0] } }),
      page.request.post(`/api/tasks/${ids[0]}/move`, { data: { column: 'done', beforeTaskId: null } }),
    ]);
    expect(moves.map((r) => r.status()).filter((code) => code >= 500)).toEqual([]);
    const after = await board(page, s.projectId);
    for (const column of ['draft', 'in_progress', 'done']) {
      const positions = (after.tasks as unknown as { column: string; position: number }[]).filter((t) => t.column === column).map((t) => t.position).sort((a, b) => a - b);
      expect(positions).toEqual(positions.map((_, i) => i + 1));
    }
    expect(after.tasks).toHaveLength(5);
    // Dwa dodania naraz do pustej kolumny: oba zapisane, pozycje 1 i 2.
    const both = await Promise.all([
      s.member.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: { title: 'Naraz A', description: '', dueDate: '', column: 'done', assigneeIds: [] } }),
      page.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: { title: 'Naraz B', description: '', dueDate: '', column: 'done', assigneeIds: [] } }),
    ]);
    expect(both.map((r) => r.status())).toEqual([201, 201]);
    await s.cleanup();
  });

  test('złe dane: skrypt w tytule widać jako tekst, za długi tytuł → 400; usunięcie osoby z projektu zostawia zadanie', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const s = await setup(page, browser);
    const xss = '<script>alert(1)</script>';
    const taskId = await s.newTask(s.member, s.projectId, xss, { assigneeIds: [s.memberId] });
    let dialogs = 0;
    s.member.on('dialog', () => { dialogs += 1; });
    await s.member.goto(`/admin/tasks/${s.projectId}`);
    await expect(s.member.getByText(xss)).toBeVisible();
    expect(dialogs).toBe(0);
    const long = await s.member.request.post(`/api/tasks/projects/${s.projectId}/tasks`, { data: { title: 'x'.repeat(151), description: '', dueDate: '', column: 'draft', assigneeIds: [] } });
    expect(long.status()).toBe(400);
    // Usunięcie osoby z projektu: zadanie zostaje, bez niej; osoba traci dostęp do tablicy.
    expect((await page.request.put(`/api/tasks/projects/${s.projectId}`, { data: { name: `E2E Nadużycia ${String(s.projectId)}x`, memberIds: [] } })).status()).toBe(200);
    const after = await board(page, s.projectId);
    expect(after.tasks.find((t) => t.id === taskId)!.assigneeIds).toEqual([]);
    expect((await s.member.request.get(`/api/tasks/projects/${s.projectId}/board`)).status()).toBe(404);
    await page.request.delete(`/api/tasks/projects/${s.projectId}`, { data: { confirmName: `E2E Nadużycia ${String(s.projectId)}x` } });
    await s.cleanup();
  });
});
