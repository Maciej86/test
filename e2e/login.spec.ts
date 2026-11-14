import { expect, test, type Page } from '@playwright/test';

// Konta i hasło zakłada e2e/global-setup.ts (losowe hasło przy każdym uruchomieniu).
const ADMIN = 'e2e.admin@test.local';
const EMPLOYEE = 'e2e.employee@test.local';
const password = () => process.env.E2E_PASSWORD!;

async function logIn(page: Page, login: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel('Login').fill(login);
  await page.getByLabel('Hasło', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
}

test('administrator loguje się i widzi Pulpit', async ({ page }) => {
  await logIn(page, ADMIN.toUpperCase(), password());
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('złe hasło pokazuje komunikat', async ({ page }) => {
  await logIn(page, ADMIN, 'zle-haslo-1');
  await expect(page.getByText(/Login lub hasło są nieprawidłowe/)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('pracownik z hasłem tymczasowym ustawia własne i widzi Pulpit', async ({ page }) => {
  await logIn(page, EMPLOYEE, password());
  await expect(page).toHaveURL(/\/change-password$/);
  await page.goto('/admin/tasks');
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel('Nowe hasło', { exact: true }).fill(password());
  await page.getByLabel('Powtórz nowe hasło').fill(password());
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej' }).click();
  await expect(page.getByText('Nowe hasło musi być inne niż tymczasowe.')).toBeVisible();
  const own = `${password()}-x`;
  await page.getByLabel('Nowe hasło', { exact: true }).fill(own);
  await page.getByLabel('Powtórz nowe hasło').fill(own);
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('wylogowanie prowadzi na ekran logowania', async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  await page.getByLabel('Menu użytkownika').click();
  await page.getByText('Wyloguj').click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/login$/);
});
