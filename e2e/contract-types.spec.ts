import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addEmployee, logIn, logInWithOwnPassword, logOut, password } from './helpers';

// Typy dodaje sam test („E2E <czas>”), a seed przy następnym uruchomieniu zdejmuje je z kont i usuwa.
const row = (page: Page, name: string) => page.getByRole('row', { name: new RegExp(name) });
const names = (page: Page) => page.getByRole('table').locator('tbody tr td:nth-child(2) p:first-child').allTextContents();

const addType = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'Dodaj typ umowy' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj typ umowy' });
  await dialog.getByLabel(/^Nazwa/).fill(name);
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Dodano typ umowy')).toBeVisible();
};

/** Otwiera okno „Edytuj” pracownika z listy (lista jest już przefiltrowana po loginie). */
const editEmployee = async (page: Page, login: string, employee: string) => {
  await page.goto('/admin/employees');
  await page.getByPlaceholder('Szukaj po imieniu, nazwisku albo loginie').fill(login);
  await row(page, employee).getByRole('button', { name: 'Edytuj' }).click();
  return page.getByRole('dialog');
};

const contractField = (page: Page) => page.getByRole('dialog').getByRole('combobox', { name: 'Rodzaj umowy' });

test.beforeEach(async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('administrator dodaje, zmienia, przesuwa, wybiera u pracownika, ukrywa i przywraca typ umowy', async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E ${stamp}`;
  const renamed = `E2E ${stamp} staż`;
  const { login } = await addEmployee(page, 'Ewa Umowa');

  await page.getByRole('button', { name: 'Ustawienia' }).click();
  await page.getByRole('link', { name: 'Typy umów' }).click();
  await expect(page.getByRole('heading', { name: 'Typy umów' })).toBeVisible();
  await addType(page, name);
  await expect(row(page, name)).toContainText('nikt');

  await row(page, name).getByRole('button', { name: 'Edytuj' }).click();
  await page.getByRole('dialog').getByLabel(/^Nazwa/).fill(renamed);
  await page.getByRole('dialog').getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano zmiany')).toBeVisible();

  expect((await names(page)).at(-1)).toBe(renamed);
  await row(page, renamed).getByRole('button', { name: 'Przesuń wyżej' }).click();
  await expect.poll(async () => (await names(page)).at(-2)).toBe(renamed);

  // Pracownik dostaje nowy typ.
  let dialog = await editEmployee(page, login, 'Ewa Umowa');
  await contractField(page).click();
  await page.getByRole('option', { name: renamed }).click();
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano dane pracownika.')).toBeVisible();
  await expect(row(page, 'Ewa Umowa')).toContainText(renamed);

  // Ukrycie: pracownik go zachowuje, okno nowego pracownika go nie pokazuje.
  await page.goto('/admin/contract-types');
  await expect(row(page, renamed)).toContainText('1 pracownik');
  await row(page, renamed).getByRole('button', { name: 'Ukryj' }).click();
  await expect(page.getByRole('dialog')).toContainText('1 pracownik z tą umową ją zachowa');
  await page.getByRole('dialog').getByRole('button', { name: 'Ukryj' }).click();
  await expect(page.getByText('Typ ukryty')).toBeVisible();
  await expect(row(page, renamed)).toHaveCount(0);

  dialog = await editEmployee(page, login, 'Ewa Umowa');
  await expect(contractField(page)).toHaveValue(`${renamed} (ukryty)`);
  await dialog.getByLabel(/^E-mail do powiadomień/).fill(`ewa.${stamp}@test.local`);
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano dane pracownika.')).toBeVisible();
  await expect(row(page, 'Ewa Umowa')).toContainText(renamed);

  await page.getByRole('button', { name: 'Dodaj pracownika' }).first().click();
  await contractField(page).click();
  await expect(page.getByRole('option', { name: 'Umowa o pracę' })).toBeVisible();
  await expect(page.getByRole('option', { name: new RegExp(renamed) })).toHaveCount(0);
  await page.keyboard.press('Escape');

  // Przywrócenie przez „Pokaż ukryte”.
  await page.goto('/admin/contract-types');
  await page.getByLabel(/Pokaż ukryte/).check({ force: true });
  await expect(row(page, renamed)).toContainText('ukryty');
  await row(page, renamed).getByRole('button', { name: 'Przywróć' }).click();
  await expect(page.getByText('Typ jest znowu do wyboru u pracownika')).toBeVisible();
  await expect.poll(async () => (await names(page)).at(-1)).toBe(renamed);
});

test('nazwa zajęta: błąd pod polem, także dla innej wielkości liter', async ({ page }) => {
  await page.goto('/admin/contract-types');
  await page.getByRole('button', { name: 'Dodaj typ umowy' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj typ umowy' });
  await dialog.getByLabel(/^Nazwa/).fill('umowa zlecenie');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(dialog.getByText('Typ o tej nazwie już jest.')).toBeVisible();
});

test('pracownik nie widzi typów umów i nie wejdzie pod adres', async ({ page }) => {
  const { login, temporary } = await addEmployee(page, 'Ula Umowna');
  await logOut(page);
  await logInWithOwnPassword(page, login, temporary);
  await expect(page.getByRole('button', { name: 'Ustawienia' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Typy umów' })).toHaveCount(0);
  await page.goto('/admin/contract-types');
  await expect(page.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
});
