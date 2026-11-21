import { expect, test } from '@playwright/test';
import { ADMIN, DAY, employee, iso, logIn, next, password, todayUtc, typed } from './helpers';

// Scenariusze z docs/modules/calendar/TESTS-1.md. Pracownika zakłada test (e2e.tmp.*, pula 20 dni); jego wniosek
// znika razem z kontem w global-teardown.ts. Kalendarz pokazuje też innych pracowników z bazy, więc test sprawdza
// tylko swój wiersz (wyszukiwarka po nazwisku).

test('administrator widzi wniosek w kalendarzu, filtruje, zatwierdza z kalendarza i wraca ze szczegółów wniosku', async ({ page, browser }) => {
  test.setTimeout(90_000);
  // Piątek i wtorek: urlop w dniach roboczych pęka na weekend (dwa kawałki i linia).
  const friday = next(5, 3);
  const tuesday = new Date(friday.getTime() + 4 * DAY);
  test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');
  test.skip(tuesday.getTime() - todayUtc().getTime() > 59 * DAY, 'termin poza widocznymi 61 dniami');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const lastName = `Kalendarzowa${String.fromCharCode(97 + Math.floor(Math.random() * 26))}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
  const name = `Ewa ${lastName}`;
  const { page: ewa } = await employee(page, browser, 'Ewa', lastName);

  const overview = (await (await ewa.request.get('/api/my-leave/overview')).json()) as { types: { id: number; name: string }[] };
  const vacation = overview.types.find((t) => t.name === 'Wypoczynkowy') ?? overview.types[0]!;
  const created = await ewa.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(friday), dateTo: iso(tuesday), comment: '' } });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = (await created.json()) as { id: number };

  // Pulpit → „Otwórz kalendarz”.
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Otwórz kalendarz' }).click();
  await expect(page).toHaveURL(/\/admin\/calendar$/);
  await expect(page.getByRole('heading', { name: 'Kalendarz' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dziś' })).toBeDisabled();

  // Swój wiersz: czekający pasek w dwóch kawałkach z linią w weekend.
  await page.getByLabel('Szukaj osoby').fill(lastName);
  const row = page.locator(`[data-testid="calendar-row"][data-name="${name}"]`);
  await expect(page.getByTestId('calendar-row')).toHaveCount(1);
  const pending = row.getByRole('button', { name: `${name}: ${vacation.name} (czeka)` });
  await expect(pending).toHaveCount(2);
  await expect(row.getByTestId('calendar-bridge')).toHaveCount(1);

  // Filtr koloru chowa i pokazuje paski.
  // Pole wyboru w przycisku jest schowane; klika się napis (jak użytkownik).
  const chip = page.getByRole('group', { name: 'Pokaż typy urlopów' }).locator('label', { hasText: vacation.name });
  await chip.click();
  await expect(pending).toHaveCount(0);
  await chip.click();
  await expect(pending).toHaveCount(2);

  // Wyszukiwanie bez wyników.
  await page.getByLabel('Szukaj osoby').fill('Nikogo-takiego-nie-ma');
  await expect(page.getByText('Nikt o takim imieniu lub nazwisku nie pracuje w firmie.')).toBeVisible();
  await page.getByLabel('Szukaj osoby').fill(lastName);

  // Strzałki przesuwają zakres, „Dziś” wraca.
  await page.getByRole('button', { name: '30 dni później' }).click();
  await expect(page).toHaveURL(new RegExp(`from=${iso(new Date(todayUtc().getTime() + 30 * DAY))}`));
  await page.getByRole('button', { name: 'Dziś' }).click();
  await expect(page).toHaveURL(/\/admin\/calendar$/);

  // Klik w pasek → szczegóły wniosku, zatwierdzenie z kalendarza.
  await pending.first().click();
  const drawer = page.getByRole('dialog', { name: `Wniosek nr ${id}` });
  await expect(drawer).toContainText(name);
  await drawer.getByRole('button', { name: 'Zatwierdź' }).click();
  await page.getByRole('dialog', { name: 'Zatwierdzić wniosek?' }).getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(page.getByText(`Wniosek zatwierdzony. ${name} dostaje powiadomienie.`)).toBeVisible();
  await expect(row.getByRole('button', { name: `${name}: ${vacation.name}`, exact: true })).toHaveCount(2);

  // Wnioski urlopowe → szczegóły → „Pokaż w kalendarzu” od pierwszego dnia wniosku.
  await page.goto(`/admin/leave-requests/${id}`);
  await page.getByRole('dialog', { name: `Wniosek nr ${id}` }).getByRole('link', { name: 'Pokaż w kalendarzu' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/calendar\\?from=${iso(friday)}$`));
  await expect(page.getByText(`${typed(friday)} – `)).toBeVisible();
});

test('pracownik nie ma kalendarza w menu, a API odpowiada 403', async ({ page, browser }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: worker } = await employee(page, browser, 'Ida', 'Bezkalendarza');
  await expect(worker.getByRole('navigation').getByRole('link', { name: 'Pulpit' })).toBeVisible();
  await expect(worker.getByRole('navigation').getByRole('link', { name: 'Kalendarz' })).toHaveCount(0);
  expect((await worker.request.get('/api/calendar')).status()).toBe(403);
});

test.describe('część 2: liczenie dni i zatwierdzanie', () => {
  test.fixme('administrator widzi kolumny „Liczenie dni” i „Zatwierdzanie” i typ „Chorobowe”', async () => {});
  test.fixme('pracownik zgłasza chorobowe 2 dni wstecz: od razu zatwierdzone, powiadomienie, ciągły pasek, wycofanie', async () => {});
  test.fixme('typ kalendarzowy z zatwierdzaniem liczy weekend', async () => {});
});
