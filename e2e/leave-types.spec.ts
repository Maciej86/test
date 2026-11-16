import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addEmployee, logIn, logInWithOwnPassword, logOut, password } from './helpers';

// Typy dodaje sam test („E2E <czas>”), a seed usuwa je przy następnym uruchomieniu (nie mają wniosków).
const row = (page: Page, name: string) => page.getByRole('row', { name: new RegExp(name) });
const names = (page: Page) => page.getByRole('table').locator('tbody tr td:nth-child(2) p:first-child').allTextContents();

const addType = async (page: Page, name: string, limit?: string) => {
  await page.getByRole('button', { name: 'Dodaj typ urlopu' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj typ urlopu' });
  await dialog.getByLabel(/^Nazwa/).fill(name);
  if (limit) await dialog.getByLabel('Limit dni w roku').fill(limit);
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Dodano typ urlopu')).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('administrator dodaje, zmienia, przesuwa, ukrywa i przywraca typ urlopu', async ({ page }) => {
  const name = `E2E ${Date.now()}`;
  await page.getByRole('link', { name: 'Typy urlopów' }).click();
  await expect(page.getByRole('heading', { name: 'Typy urlopów' })).toBeVisible();
  await addType(page, name);
  await expect(row(page, name)).toContainText('bez limitu');
  await expect(row(page, name)).toContainText('odejmuje');

  await row(page, name).getByRole('button', { name: 'Edytuj' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Limit dni w roku').fill('3');
  await dialog.getByLabel('Odejmuje dni z puli').uncheck({ force: true });
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano zmiany')).toBeVisible();
  await expect(row(page, name)).toContainText('3 dni na osobę');
  await expect(row(page, name)).toContainText('nie odejmuje');

  const before = await names(page);
  expect(before.at(-1)).toBe(name);
  await row(page, name).getByRole('button', { name: 'Przesuń wyżej' }).click();
  await expect.poll(async () => (await names(page)).at(-2)).toBe(name);

  await row(page, name).getByRole('button', { name: 'Ukryj' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ukryj' }).click();
  await expect(page.getByText('Typ ukryty')).toBeVisible();
  await expect(row(page, name)).toHaveCount(0);

  await page.getByLabel(/Pokaż ukryte/).check({ force: true });
  await expect(row(page, name)).toContainText('ukryty');
  await row(page, name).getByRole('button', { name: 'Przywróć' }).click();
  await expect(page.getByText('Typ jest znowu w formularzu wniosku')).toBeVisible();
  await expect.poll(async () => (await names(page)).includes(name)).toBe(true);
});

test('nazwa zajęta: błąd pod polem, także dla innej wielkości liter', async ({ page }) => {
  await page.goto('/admin/leave-types');
  await page.getByRole('button', { name: 'Dodaj typ urlopu' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj typ urlopu' });
  await dialog.getByLabel(/^Nazwa/).fill('wypoczynkowy');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(dialog.getByText('Typ o tej nazwie już jest.')).toBeVisible();
  await dialog.getByLabel('Limit dni w roku').fill('0');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(dialog.getByText('Wartość jest za mała.')).toBeVisible();
});

test('pracownik nie widzi typów urlopów i nie wejdzie pod adres', async ({ page }) => {
  const { login, temporary } = await addEmployee(page, 'Ola Lis');
  await logOut(page);
  await logInWithOwnPassword(page, login, temporary);
  await expect(page.getByRole('link', { name: 'Typy urlopów' })).toHaveCount(0);
  await page.goto('/admin/leave-types');
  await expect(page.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
});
