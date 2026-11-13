import { expect, test } from '@playwright/test';

const MOCKUPS = `http://localhost:${process.env.MOCKUPS_PORT ?? 5174}`;

test('makieta pokazuje pasek MAKIETA', async ({ page }) => {
  await page.goto(`${MOCKUPS}/`);
  await expect(page.getByText('MAKIETA: to nie jest prawdziwa aplikacja')).toBeVisible();
});

test('makieta ma stronę Postęp', async ({ page }) => {
  await page.goto(`${MOCKUPS}/progress`);
  await expect(page.getByRole('heading', { name: 'Postęp budowy' })).toBeVisible();
});

test('aplikacja otwiera stronę główną', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Witaj!' })).toBeVisible();
});
