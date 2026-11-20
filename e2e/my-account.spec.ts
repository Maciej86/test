import { expect, test, type Page } from '@playwright/test';
import { ADMIN, employee, logIn, logOut, password } from './helpers';

// Konta „e2e.tmp.…” sprząta global-teardown.ts; stałych kont testowych nie zmieniamy (inne testy znają ich hasła).
const OWN = 'Wlasne-haslo-7';
const entry = (page: Page, text: string | RegExp) => page.locator('main button[aria-expanded]', { hasText: text });
const card = (page: Page, title: string) => page.locator('.mantine-Card-root', { has: page.getByRole('heading', { name: title }) });

const openMyAccount = async (page: Page) => {
  await page.getByLabel('Menu użytkownika').click();
  await page.getByRole('menuitem', { name: 'Moje konto' }).click();
  await expect(page.getByRole('heading', { name: 'Moje konto' })).toBeVisible();
};

const changePassword = async (page: Page, current: string, next: string, repeat = next) => {
  await page.getByLabel(/^Obecne hasło/).fill(current);
  await page.getByLabel(/^Nowe hasło/).fill(next);
  await page.getByLabel(/^Powtórz nowe hasło/).fill(repeat);
  await page.getByRole('button', { name: 'Zmień hasło' }).click();
};

test('administrator widzi swoje dane, pracownik zmienia e-mail do powiadomień', async ({ page, browser }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  await openMyAccount(page);
  await expect(card(page, 'Moje dane')).toContainText(ADMIN);
  await expect(card(page, 'Moje dane')).toContainText('Administrator');
  await expect(page.getByText('Te dane zmienisz w Pracownikach.')).toBeVisible();
  await expect(page.getByText('Na ten adres przychodzą e-maile o nowych wnioskach urlopowych.')).toBeVisible();

  const stamp = Date.now();
  const taken = `zajety.${stamp}@test.local`;
  const other = await page.request.post('/api/employees', {
    data: { firstName: 'Zofia', lastName: 'Zajęta', login: `e2e.tmp.${stamp}9@test.local`, email: taken, role: 'employee', password: 'Urlop-2026!', annualDays: 20, carriedDays: 0 },
  });
  expect(other.status()).toBe(201);

  const { page: ola, login } = await employee(page, browser, 'Ola', 'Kontowa');
  await openMyAccount(ola);
  await expect(ola.getByText('Na razie aplikacja nie wysyła Ci e-maili; powiadomienia widzisz pod dzwonkiem.')).toBeVisible();
  await ola.getByLabel('Adres e-mail').fill(taken);
  await ola.getByRole('button', { name: 'Zapisz e-mail' }).click();
  await expect(ola.getByText('Ten e-mail ma już inne konto.')).toBeVisible();
  await expect(ola.getByText('Zofia')).toHaveCount(0);
  const mine = `ola.${stamp}@test.local`;
  await ola.getByLabel('Adres e-mail').fill(mine);
  await ola.getByRole('button', { name: 'Zapisz e-mail' }).click();
  await expect(ola.getByText('Zapisano e-mail do powiadomień')).toBeVisible();

  await page.goto(`/admin/employees?search=${encodeURIComponent(login)}`);
  await expect(page.getByRole('row', { name: /Ola Kontowa/ })).toContainText(mine);
});

test('pracownik zmienia hasło: błędy pod polami, potem nowe hasło działa, a stare nie; wpis w historii', async ({ page, browser }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: piotr, login } = await employee(page, browser, 'Piotr', 'Haslowy');
  await openMyAccount(piotr);

  await changePassword(piotr, 'zle-haslo-1', 'Nowe-haslo-8');
  await expect(piotr.getByText('Obecne hasło jest nieprawidłowe.')).toBeVisible();
  await changePassword(piotr, OWN, OWN);
  await expect(piotr.getByText('Nowe hasło musi być inne niż obecne.')).toBeVisible();
  await changePassword(piotr, OWN, 'Nowe-haslo-8', 'Nowe-haslo-9');
  await expect(piotr.getByText('Hasła się różnią. Wpisz to samo hasło dwa razy.')).toBeVisible();
  await changePassword(piotr, OWN, 'Nowe-haslo-8');
  await expect(piotr.getByText('Hasło zmienione')).toBeVisible();
  await expect(piotr.getByLabel(/^Obecne hasło/)).toHaveValue('');
  // Dalej zalogowany na tym urządzeniu.
  await piotr.reload();
  await expect(piotr.getByRole('heading', { name: 'Moje konto' })).toBeVisible();

  await logOut(piotr);
  await logIn(piotr, login, OWN);
  await expect(piotr.getByText('Login lub hasło są nieprawidłowe. Sprawdź je i spróbuj ponownie.')).toBeVisible();
  await logIn(piotr, login, 'Nowe-haslo-8');
  await expect(piotr.getByRole('heading', { name: 'Pulpit' })).toBeVisible();

  await page.goto(`/admin/activity-log?search=${encodeURIComponent('Piotr Haslowy')}`);
  await expect(entry(page, 'Zmiana własnego hasła').first()).toContainText('Piotr Haslowy');
});

test('zmiana hasła wylogowuje drugie urządzenie', async ({ page, browser }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: phone, login } = await employee(page, browser, 'Ewa', 'Dwaurzadzenia');
  const laptop = await (await browser.newContext()).newPage();
  await logIn(laptop, login, OWN);
  await expect(laptop.getByRole('heading', { name: 'Pulpit' })).toBeVisible();

  await openMyAccount(laptop);
  await changePassword(laptop, OWN, 'Nowe-haslo-8');
  await expect(laptop.getByText('Hasło zmienione')).toBeVisible();

  await phone.goto('/admin/my-leave');
  await expect(phone).toHaveURL(/\/login/);
  await laptop.goto('/admin/my-leave');
  await expect(laptop).not.toHaveURL(/\/login/);
});
