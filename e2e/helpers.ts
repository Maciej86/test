import { expect, type Browser, type Page } from '@playwright/test';

// Wspólne kroki testów w przeglądarce. Stałe konta zakłada e2e/global-setup.ts, hasło E2E_PASSWORD jest w .env.
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

/* Daty do testów urlopów: liczone od dziś (UTC), żeby testy działały każdego dnia. */
export const DAY = 24 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');
/** `DD.MM.RRRR`, tak jak wpisuje się datę w polu. */
export const typed = (d: Date) => `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;
/** `RRRR-MM-DD`, tak jak daty idą do API. */
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const todayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};
/** Pierwszy dzień tygodnia `weekday` (0 = niedziela) co najmniej `minAhead` dni od dziś. */
export const next = (weekday: number, minAhead: number) => {
  let d = new Date(todayUtc().getTime() + minAhead * DAY);
  while (d.getUTCDay() !== weekday) d = new Date(d.getTime() + DAY);
  return d;
};

/**
 * Konto pracownika z pulą 20 dni (przez API zalogowanego administratora `admin`) i jego własna karta przeglądarki
 * po ustawieniu hasła (`Wlasne-haslo-7`).
 */
export const employee = async (admin: Page, browser: Browser, firstName: string, lastName = 'Nadużycie') => {
  const login = `e2e.tmp.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  const temporary = 'Urlop-2026!';
  const created = await admin.request.post('/api/employees', {
    data: { firstName, lastName, login, email: '', role: 'employee', password: temporary, annualDays: 20, carriedDays: 0 },
  });
  expect(created.status()).toBe(201);
  const page = await (await browser.newContext()).newPage();
  await logInWithOwnPassword(page, login, temporary);
  return { page, login };
};
