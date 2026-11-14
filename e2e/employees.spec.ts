import { expect, test, type Page } from '@playwright/test';

// Konto administratora i hasło zakłada e2e/global-setup.ts. Pracowników zakłada sam test (e2e.tmp.*), a seed
// usuwa ich przy następnym uruchomieniu. „Zamknij rok” tylko do podglądu: zatwierdzenie zmieniłoby pule
// w lokalnej bazie na stałe (zamknięcie roku sprawdzają testy serwera).
const ADMIN = 'e2e.admin@test.local';
const password = () => process.env.E2E_PASSWORD!;

async function logIn(page: Page, login: string, pass: string) {
  await page.goto('/login');
  await page.getByLabel('Login').fill(login);
  await page.getByLabel('Hasło', { exact: true }).fill(pass);
  await page.getByRole('button', { name: 'Zaloguj się' }).click();
}

async function logOut(page: Page) {
  await page.getByLabel('Menu użytkownika').click();
  await page.getByText('Wyloguj').click();
  await expect(page).toHaveURL(/\/login$/);
}

/** Dodaje pracownika przez okno; zwraca login i wygenerowane hasło tymczasowe. */
async function addEmployee(page: Page, name: string) {
  const login = `e2e.tmp.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
  await page.goto('/admin/employees');
  await page.getByRole('button', { name: 'Dodaj pracownika' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj pracownika' });
  await dialog.getByLabel('Imię i nazwisko').fill(name);
  await dialog.getByLabel('Login').fill(login);
  await dialog.getByRole('button', { name: 'Wygeneruj' }).click();
  const temporary = await dialog.getByLabel('Hasło tymczasowe').inputValue();
  await dialog.getByLabel('Dni na rok').fill('20');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Dodano pracownika. Przekaż mu login i hasło tymczasowe.')).toBeVisible();
  await page.getByPlaceholder('Szukaj po imieniu, nazwisku albo loginie').fill(login);
  await expect(page.getByRole('row', { name: new RegExp(name) })).toBeVisible();
  return { login, temporary };
}

const row = (page: Page, name: string) => page.getByRole('row', { name: new RegExp(name) });

test.beforeEach(async ({ page }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('administrator dodaje pracownika, a ten loguje się i ustawia własne hasło', async ({ page }) => {
  const { login, temporary } = await addEmployee(page, 'Tomasz Nowicki');
  await expect(row(page, 'Tomasz Nowicki')).toContainText('z 20 dni zostało');
  await logOut(page);
  await logIn(page, login, temporary);
  await expect(page).toHaveURL(/\/change-password$/);
  await page.getByLabel('Nowe hasło', { exact: true }).fill('Wlasne-haslo-7');
  await page.getByLabel('Powtórz nowe hasło').fill('Wlasne-haslo-7');
  await page.getByRole('button', { name: 'Zapisz i przejdź dalej' }).click();
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
});

test('administrator zmienia pulę i widzi pasek', async ({ page }) => {
  await addEmployee(page, 'Halina Bąk');
  await row(page, 'Halina Bąk').getByRole('button', { name: 'Edytuj' }).click();
  const dialog = page.getByRole('dialog', { name: /Edytuj/ });
  await dialog.getByLabel('Dni na rok').fill('26');
  await dialog.getByLabel(/Zaległe z/).fill('4');
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.getByText('Zapisano dane pracownika.')).toBeVisible();
  await expect(row(page, 'Halina Bąk')).toContainText('z 30 dni zostało');
  await expect(row(page, 'Halina Bąk')).toContainText('w tym 4 dni zaległe');
});

test('Ustaw hasło daje nowe hasło tymczasowe', async ({ page }) => {
  const { login } = await addEmployee(page, 'Robert Sowa');
  await row(page, 'Robert Sowa').getByRole('button', { name: 'Ustaw hasło' }).click();
  const dialog = page.getByRole('dialog', { name: /Nowe hasło/ });
  await dialog.getByRole('button', { name: 'Wygeneruj' }).click();
  const fresh = await dialog.getByLabel('Hasło tymczasowe').inputValue();
  await dialog.getByRole('button', { name: 'Ustaw hasło' }).click();
  await expect(page.getByText('Ustawiono hasło tymczasowe.')).toBeVisible();
  await logOut(page);
  await logIn(page, login, fresh);
  await expect(page).toHaveURL(/\/change-password$/);
});

test('Do archiwum blokuje logowanie, a ten sam login proponuje przywrócenie', async ({ page }) => {
  const { login, temporary } = await addEmployee(page, 'Ewa Mazurek');
  await row(page, 'Ewa Mazurek').getByRole('button', { name: 'Do archiwum' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Do archiwum' }).click();
  await expect(page.getByText('Przeniesiono do archiwum.')).toBeVisible();
  await expect(row(page, 'Ewa Mazurek')).toHaveCount(0);

  await page.getByRole('button', { name: 'Dodaj pracownika' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Dodaj pracownika' });
  await dialog.getByLabel('Imię i nazwisko').fill('Ewa Mazurek');
  await dialog.getByLabel('Login').fill(login.toUpperCase());
  await dialog.getByRole('button', { name: 'Wygeneruj' }).click();
  await dialog.getByRole('button', { name: 'Zapisz' }).click();
  await expect(dialog.getByText('Ten login ma konto w archiwum: Ewa Mazurek.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Przywróć konto zamiast zakładać nowe' }).click();
  await page.getByRole('button', { name: 'Przywróć konto', exact: true }).click();
  await expect(page.getByText('Przywrócono konto: Ewa Mazurek.')).toBeVisible();
  await expect(row(page, 'Ewa Mazurek')).toBeVisible();

  await row(page, 'Ewa Mazurek').getByRole('button', { name: 'Do archiwum' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Do archiwum' }).click();
  await logOut(page);
  await logIn(page, login, temporary);
  await expect(page.getByText(/Login lub hasło są nieprawidłowe/)).toBeVisible();
});

test('Zamknij rok pokazuje podgląd z sumą na nowy rok', async ({ page }) => {
  await addEmployee(page, 'Zofia Kruk');
  await page.goto('/admin/employees');
  await page.getByRole('button', { name: /^Zamknij rok \d{4}$/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('columnheader', { name: /Razem w \d{4}/ })).toBeVisible();
  await expect(dialog.getByRole('row', { name: /Zofia Kruk/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Anuluj' }).click();
  await expect(dialog).toHaveCount(0);
});
