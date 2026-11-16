import { expect, test, type Page } from '@playwright/test';
import { ADMIN, password } from './helpers';

// Moduł E-mail: link z e-maila prowadzi do panelu; niezalogowany po zalogowaniu wraca na ten adres.

const fillLogin = async (page: Page) => {
  await page.getByLabel('Login').fill(ADMIN);
  await page.getByLabel('Hasło', { exact: true }).fill(password());
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
};

test('niezalogowany otwiera adres w panelu, loguje się i wraca na ten adres', async ({ page }) => {
  await page.goto('/admin/employees');
  await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Femployees$/);
  await fillLogin(page);
  await expect(page).toHaveURL(/\/admin\/employees$/);
  await expect(page.getByRole('heading', { name: 'Pracownicy' })).toBeVisible();
});

test('adres spoza aplikacji w next jest pomijany', async ({ page }) => {
  await page.goto('/login?next=https%3A%2F%2Fexample.com');
  await fillLogin(page);
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});
