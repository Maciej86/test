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
