import { expect, test, type Page } from '@playwright/test';
import { ADMIN, addEmployee, logIn, logInWithOwnPassword, logOut, password } from './helpers';

// Scenariusze z docs/modules/my-leave/TESTS-1.md. Pracownika zakłada test (e2e.tmp.*, pula 20 dni), a seed usuwa go
// razem z wnioskami przy następnym uruchomieniu. Daty liczone od dziś: najbliższy poniedziałek i wtorek (co najmniej
// 2 dni naprzód), najbliższy weekend i styczeń następnego roku.

const DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
/** `DD.MM.RRRR`, tak jak wpisuje się datę w polu. */
const typed = (d: Date) => `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
/** Pierwszy dzień tygodnia `weekday` (0 = niedziela) co najmniej `minAhead` dni od dziś. */
const next = (weekday: number, minAhead: number) => {
  let d = new Date(todayUtc().getTime() + minAhead * DAY);
  while (d.getUTCDay() !== weekday) d = new Date(d.getTime() + DAY);
  return d;
};

const monday = next(1, 2);
const tuesday = new Date(monday.getTime() + DAY);
const saturday = next(6, 1);
const sunday = new Date(saturday.getTime() + DAY);
const nextYear = todayUtc().getUTCFullYear() + 1;

const fillDates = async (page: Page, from: string, to: string) => {
  const dialog = page.getByRole('dialog', { name: 'Złóż wniosek' });
  await dialog.getByRole('textbox', { name: /^Od/ }).fill(from);
  await dialog.getByRole('textbox', { name: /^Do/ }).fill(to);
  await dialog.getByRole('textbox', { name: /^Do/ }).blur();
};

test('pracownik składa wniosek, widzi blokady i go wycofuje; administrator dostaje powiadomienie', async ({ page }) => {
  // Dwie osoby i kilka logowań: więcej czasu niż domyślne 30 s.
  test.setTimeout(60_000);
  test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { login, temporary } = await addEmployee(page, 'Marek Urlopowy');
  await logOut(page);

  // Pracownik: pula i złożenie wniosku.
  await logInWithOwnPassword(page, login, temporary);
  await page.getByRole('link', { name: 'Moje urlopy' }).click();
  await expect(page.getByRole('heading', { name: 'Moje urlopy' })).toBeVisible();
  await expect(page.getByText('dni do wykorzystania (z 20)')).toBeVisible();
  await expect(page.getByText('W tym roku nie masz jeszcze wniosków. Złóż pierwszy, gdy zaplanujesz urlop.')).toBeVisible();

  await page.getByRole('button', { name: 'Złóż wniosek' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Złóż wniosek' });
  await expect(dialog.getByText('Odejmuje dni z puli')).toBeVisible();
  await fillDates(page, typed(monday), typed(tuesday));
  await expect(dialog.getByLabel('Dni wybranego terminu')).toBeVisible();
  await expect(dialog.getByText(/dni? robocz/).first()).toBeVisible();
  await dialog.getByLabel('Komentarz dla administratora').fill('Wizyta u rodziny.');
  await dialog.getByRole('button', { name: 'Złóż wniosek' }).click();
  await expect(page.getByText('Wniosek złożony. Administrator dostał powiadomienie.')).toBeVisible();
  const row = page.getByRole('row', { name: /Wizyta u rodziny/ });
  await expect(row).toContainText('Czeka na decyzję');
  await expect(page.getByTestId('pool-legend')).toContainText('czeka na decyzję');

  // Blokady w oknie: termin zajęty, przyszły rok, weekend.
  await page.getByRole('button', { name: 'Złóż wniosek' }).first().click();
  await fillDates(page, typed(tuesday), typed(tuesday));
  await expect(dialog.getByText('Ten termin jest już we wniosku')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Złóż wniosek' })).toBeDisabled();
  await fillDates(page, `11.01.${nextYear}`, `15.01.${nextYear}`);
  await expect(dialog.getByText(`Pula na ${nextYear} nie jest jeszcze ustalona`)).toBeVisible();
  if (sunday.getUTCFullYear() === todayUtc().getUTCFullYear()) {
    await fillDates(page, typed(saturday), typed(sunday));
    await expect(dialog.getByText('W tym terminie nie ma dni roboczych')).toBeVisible();
  }
  await dialog.getByRole('button', { name: 'Anuluj' }).click();
  await logOut(page);

  // Administrator: dzwonek, pula z czekającymi dniami, zablokowane „Zamknij rok”, brak „Moich urlopów”.
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  await page.getByRole('button', { name: /Powiadomienia/ }).click();
  await expect(page.getByText('Nowy wniosek: Marek Urlopowy').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/admin/employees');
  await page.getByPlaceholder('Szukaj po imieniu, nazwisku albo loginie').fill(login);
  await expect(page.getByRole('row', { name: /Marek Urlopowy/ })).toContainText(/czekają? na decyzję/);
  await page.getByRole('button', { name: /^Zamknij rok/ }).first().click();
  const closeYear = page.getByRole('dialog', { name: /Zamknij rok/ });
  await expect(closeYear.getByText(/^Najpierw rozpatrz \d+ wnios/)).toBeVisible();
  await expect(closeYear.getByRole('button', { name: /^Zamknij rok/ })).toBeDisabled();
  await closeYear.getByRole('button', { name: 'Anuluj' }).click();
  await expect(page.getByRole('link', { name: 'Moje urlopy' })).toHaveCount(0);
  await page.goto('/admin/my-leave');
  await expect(page.getByText('Nie masz dostępu do tej części aplikacji.')).toBeVisible();
  await logOut(page);

  // Pracownik wycofuje wniosek: „Zostaw” nic nie zmienia, „Wycofaj” oddaje dni.
  await logIn(page, login, 'Wlasne-haslo-7');
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  await page.goto('/admin/my-leave');
  await row.getByRole('button', { name: 'Wycofaj' }).click();
  const withdraw = page.getByRole('dialog', { name: 'Wycofać wniosek?' });
  await withdraw.getByRole('button', { name: 'Zostaw' }).click();
  await expect(row).toContainText('Czeka na decyzję');
  await row.getByRole('button', { name: 'Wycofaj' }).click();
  await withdraw.getByRole('button', { name: 'Wycofaj' }).click();
  await expect(page.getByText('Wniosek wycofany. Dni wróciły do puli.')).toBeVisible();
  await expect(row).toContainText('Wycofany');
  await expect(row).toContainText('nie liczą się do puli');
  await expect(page.getByText('dni do wykorzystania (z 20)')).toBeVisible();
  await expect(page.getByText('20', { exact: true }).first()).toBeVisible();
});
