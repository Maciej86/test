import { expect, type Page } from '@playwright/test';

// Wspólne kroki testów w przeglądarce. Konto administratora i hasło zakłada e2e/global-setup.ts.
export const ADMIN = 'e2e.admin@test.local';
export const password = () => process.env.E2E_PASSWORD!;

export const logIn = async (page: Page, login: string, pass: string) => {
  await page.goto('/login');
  await page.getByLabel('Login').fill(login);
  await page.getByLabel('Hasło', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
};

export const logOut = async (page: Page) => {
  await page.getByLabel('Menu użytkownika').click();
  await page.getByText('Wyloguj').click();
  await expect(page).toHaveURL(/\/login$/);
};

/** Dodaje pracownika przez okno; zwraca login i wygenerowane hasło tymczasowe. */
export const addEmployee = async (page: Page, name: string) => {
  const [firstName, lastName] = name.split(' ') as [string, string];
  const login = `e2e.tmp.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  await page.goto('/admin/employees');
  await page.getByRole('button', { name: 'Dodaj pracownika' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj pracownika' });
  await dialog.getByLabel(/^Imię/).fill(firstName);
  await dialog.getByLabel(/^Nazwisko/).fill(lastName);
  await dialog.getByLabel('Login').fill(login);
  await dialog.getByRole('button', { name: 'Wygeneruj' }).click();
  const temporary = await dialog.getByLabel('Hasło tymczasowe').inputValue();
  await dialog.getByLabel('Dni na rok').fill('20');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Dodano pracownika. Przekaż mu login i hasło tymczasowe.')).toBeVisible();
  await page.getByPlaceholder('Szukaj po imieniu, nazwisku albo loginie').fill(login);
  await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible();
  return { login, temporary };
};

/** Pracownik loguje się hasłem tymczasowym i ustawia własne; kończy na Pulpicie. */
export const logInWithOwnPassword = async (page: Page, login: string, temporary: string) => {
  await logIn(page, login, temporary);
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel('Nowe hasło', { exact: true }).fill('Wlasne-haslo-7');
  await page.getByLabel('Powtórz nowe hasło').fill('Wlasne-haslo-7');
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
};
