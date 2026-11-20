import { expect, test } from '@playwright/test';
import { ADMIN, addEmployee, logIn, logInWithOwnPassword, logOut, password } from './helpers';

// Seed (backend/src/scripts/seedE2e.ts) daje administratorowi e2e dwa nieprzeczytane powiadomienia
// („Adam Pierwszy”, „Basia Druga”) i jedno przeczytane („Ewa Przeczytana”).
test.describe.configure({ mode: 'serial' });

test('administrator: licznik, przejście z powiadomienia, strona z filtrem, „Oznacz wszystkie”', async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  await page.getByRole('button', { name: 'Powiadomienia, nieprzeczytane: 2' }).click();
  await expect(page.getByText('Nowy wniosek: Basia Druga')).toBeVisible();
  await expect(page.getByText('Nowy wniosek: Ewa Przeczytana')).toBeVisible();

  await page.getByText('Nowy wniosek: Basia Druga').click();
  await expect(page).toHaveURL(/\/admin\/leave-requests$/);
  await expect(page.getByRole('button', { name: 'Powiadomienia, nieprzeczytane: 1' })).toBeVisible();

  await page.getByRole('button', { name: 'Powiadomienia, nieprzeczytane: 1' }).click();
  await page.getByRole('button', { name: 'Pokaż wszystkie' }).click();
  await expect(page).toHaveURL(/\/admin\/notifications$/);
  // Okienko dzwonka znika z animacją (ok. 0,3 s) i do tego czasu ma te same teksty co strona.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Powiadomienia' })).toBeVisible();
  await expect(page.getByText('Dzisiaj', { exact: true })).toBeVisible();
  // Na stronie spoza menu nic nie jest podświetlone (wcześniej „Pulpit”).
  await expect(page.locator('.mantine-NavLink-root[data-active]')).toHaveCount(0);

  await page.getByText('Nieprzeczytane (1)').click();
  await expect(page).toHaveURL(/\?unread=1$/);
  await expect(page.getByText('Nowy wniosek: Adam Pierwszy')).toBeVisible();
  await expect(page.getByText('Nowy wniosek: Basia Druga')).toHaveCount(0);

  await page.getByRole('button', { name: 'Oznacz wszystkie jako przeczytane' }).click();
  await expect(page.getByText('Wszystko przeczytane.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Powiadomienia', exact: true })).toBeVisible();
});

test('pracownik: nie widzi powiadomień administratora, dzwonek pusty', async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { login, temporary } = await addEmployee(page, 'Nowa Osoba');
  await logOut(page);
  await logInWithOwnPassword(page, login, temporary);
  await page.getByRole('button', { name: 'Powiadomienia', exact: true }).click();
  await expect(page.getByText('Nie masz jeszcze powiadomień. Pojawią się tu, gdy coś będzie dotyczyć Ciebie.')).toBeVisible();
  await page.goto('/admin/notifications');
  await expect(page.getByText('Nowy wniosek: Adam Pierwszy')).toHaveCount(0);
});
