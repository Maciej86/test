import { execFileSync } from 'node:child_process';
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

test.describe('abuse', () => {
  /** Konto pracownika z pulą 20 dni (przez API administratora) i jego własna karta przeglądarki po ustawieniu hasła. */
  const employee = async (admin: Page, browser: import('@playwright/test').Browser, firstName: string) => {
    const login = `e2e.tmp.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`;
    const temporary = 'Urlop-2026!';
    const created = await admin.request.post('/api/employees', {
      data: { firstName, lastName: 'Nadużycie', login, email: '', role: 'employee', password: temporary, annualDays: 20, carriedDays: 0 },
    });
    expect(created.status()).toBe(201);
    const page = await (await browser.newContext()).newPage();
    await logInWithOwnPassword(page, login, temporary);
    return { page, login };
  };
  const employeePage = async (admin: Page, browser: import('@playwright/test').Browser, firstName: string) =>
    (await employee(admin, browser, firstName)).page;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  test('PDF: cudzy wniosek, bez logowania, administrator, wniosek nie zatwierdzony, dwa pobrania naraz', async ({ page, browser }) => {
    test.setTimeout(90_000);
    test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');
    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const { page: anna, login: annaLogin } = await employee(page, browser, 'Anna');
    const bartek = await employeePage(page, browser, 'Bartek');
    const types = ((await (await anna.request.get('/api/my-leave/overview')).json()) as { types: { id: number; yearlyLimit: number | null }[] }).types;
    const vacation = types.find((t) => t.yearlyLimit === null)!;
    const submit = async (day: Date) =>
      ((await (await anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(day), dateTo: iso(day) } })).json()) as { id: number }).id;
    const approvedId = await submit(monday);
    execFileSync('npm', ['run', 'my-leave:approve-test', '-w', '@app/backend', '--', annaLogin], { stdio: 'pipe' });
    const pendingId = await submit(tuesday);
    const pdf = (id: number, p: Page = anna) => p.request.get(`/api/my-leave/requests/${id}/pdf`);

    // Własny zatwierdzony: 200; dwa pobrania naraz: oba 200 (odczyt niczego nie zmienia).
    expect((await Promise.all([pdf(approvedId), pdf(approvedId)])).map((r) => r.status())).toEqual([200, 200]);
    // Cudzy: 404 jak nieistniejący, także z podrobionym właścicielem w adresie.
    expect((await pdf(approvedId, bartek)).status()).toBe(404);
    expect((await bartek.request.get(`/api/my-leave/requests/${approvedId}/pdf?userId=1`)).status()).toBe(404);
    // Czekający i wycofany: 409.
    expect((await pdf(pendingId)).status()).toBe(409);
    expect((await anna.request.post(`/api/my-leave/requests/${pendingId}/withdraw`)).status()).toBe(200);
    expect((await pdf(pendingId)).status()).toBe(409);
    // Administrator: 403. Bez logowania: 401.
    expect((await pdf(approvedId, page)).status()).toBe(403);
    const stranger = await (await browser.newContext()).newPage();
    expect((await pdf(approvedId, stranger)).status()).toBe(401);
  });

  test('limit typu, cudze wnioski, podrobione pola, dwa wycofania naraz, HTML w komentarzu', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const week2 = new Date(monday.getTime() + 7 * DAY);
    const week3 = new Date(monday.getTime() + 14 * DAY);
    test.skip(new Date(week3.getTime() + 2 * DAY).getUTCFullYear() !== todayUtc().getUTCFullYear(), 'za blisko końca roku');

    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const anna = await employeePage(page, browser, 'Anna');
    const bartek = await employeePage(page, browser, 'Bartek');
    const overview = (await (await anna.request.get('/api/my-leave/overview')).json()) as { types: { id: number; name: string; yearlyLimit: number | null }[] };
    const vacation = overview.types.find((t) => t.yearlyLimit === null)!;
    const limited = overview.types.find((t) => t.yearlyLimit !== null && t.yearlyLimit >= 2 && t.yearlyLimit <= 8)!;
    const span = Math.floor(limited.yearlyLimit! / 2) + 1;
    const range = (start: Date) => ({ dateFrom: iso(start), dateTo: iso(new Date(start.getTime() + (span - 1) * DAY)) });

    // 1. Dwa wnioski naraz, razem ponad limit typu: przechodzi jeden, drugi 409.
    const both = await Promise.all([
      anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: limited.id, ...range(monday) } }),
      anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: limited.id, ...range(week2) } }),
    ]);
    expect(both.map((r) => r.status()).sort()).toEqual([201, 409]);
    const refused = both.find((r) => r.status() === 409)!;
    expect((await refused.json()).error.message).toBe('my-leave.server.limit_exceeded');

    // 2. Podrobione pola: status, dni, rok puli, właściciel i decyzja liczy serwer.
    const forged = await anna.request.post('/api/my-leave/requests', {
      data: {
        leaveTypeId: vacation.id, dateFrom: iso(week3), dateTo: iso(week3), comment: '<script>alert(1)</script>',
        userId: 1, status: 'approved', workingDays: 0, daysFromCarried: 15, poolYear: 2030, decidedByName: 'Ktoś', decidedAt: '2020-01-01',
      },
    });
    expect(forged.status()).toBe(201);
    const saved = (await forged.json()) as { id: number; status: string; workingDays: number; daysFromCarried: number; poolYear: number; decidedByName: string | null };
    expect(saved).toMatchObject({ status: 'pending', workingDays: 1, daysFromCarried: 0, poolYear: todayUtc().getUTCFullYear(), decidedByName: null });

    // 3. Cudzy wniosek: Bartek go nie widzi i nie wycofa (404 jak nieistniejący).
    expect((await bartek.request.post(`/api/my-leave/requests/${saved.id}/withdraw`)).status()).toBe(404);
    const bartekList = (await (await bartek.request.get('/api/my-leave/requests')).json()) as { items: unknown[] };
    expect(bartekList.items).toHaveLength(0);

    // 4. Administrator nie składa wniosków (403).
    expect((await page.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(week3), dateTo: iso(week3) } })).status()).toBe(403);

    // 5. HTML w komentarzu widać jako zwykły tekst.
    await anna.goto('/admin/my-leave');
    await expect(anna.getByRole('row', { name: /<script>alert\(1\)<\/script>/ })).toBeVisible();

    // 6. Dwa wycofania naraz: jedno przechodzi, drugie 409; wycofanego nie wycofa się ponownie.
    const withdraws = await Promise.all([
      anna.request.post(`/api/my-leave/requests/${saved.id}/withdraw`),
      anna.request.post(`/api/my-leave/requests/${saved.id}/withdraw`),
    ]);
    expect(withdraws.map((r) => r.status()).sort()).toEqual([200, 409]);

    // 7. Złe dane: odwrócone daty, za długi komentarz, przeszłość → 400 przy polu.
    const reversed = await anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(week3), dateTo: iso(monday) } });
    expect((await reversed.json()).error.fields).toEqual({ dateTo: 'my-leave.validation.dates_order' });
    const long = await anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(week3), dateTo: iso(week3), comment: 'x'.repeat(501) } });
    expect(long.status()).toBe(400);
    const past = await anna.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(new Date(todayUtc().getTime() - 2 * DAY)), dateTo: iso(todayUtc()) } });
    expect([400, 409]).toContain(past.status());
  });
});

// Scenariusze z docs/modules/my-leave/TESTS-2.md. Zatwierdza polecenie testowe (moduł „Wnioski urlopowe” jeszcze nie
// istnieje), tylko wniosek tej tymczasowej osoby (login w poleceniu), więc testy uruchomione naraz sobie nie przeszkadzają.
test('PDF: przycisk tylko przy zatwierdzonym wniosku, PDF otwiera się w nowej karcie, cudzy i administrator bez dostępu', async ({ page, context }) => {
  test.setTimeout(60_000);
  test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { login, temporary } = await addEmployee(page, 'Zofia Wydrukowa');
  await logOut(page);

  await logInWithOwnPassword(page, login, temporary);
  await page.goto('/admin/my-leave');
  await page.getByRole('button', { name: 'Złóż wniosek' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Złóż wniosek' });
  await fillDates(page, typed(monday), typed(tuesday));
  await dialog.getByLabel('Komentarz dla administratora').fill('Zażółć gęślą jaźń.');
  await dialog.getByRole('button', { name: 'Złóż wniosek' }).click();
  const row = page.getByRole('row', { name: /Zażółć gęślą jaźń/ });
  await expect(row).toContainText('Czeka na decyzję');
  await expect(row.getByRole('link', { name: 'PDF' })).toHaveCount(0);

  execFileSync('npm', ['run', 'my-leave:approve-test', '-w', '@app/backend', '--', login], { stdio: 'pipe' });
  await page.reload();
  await expect(row).toContainText('Zatwierdzony');
  await expect(row.getByRole('button', { name: 'Wycofaj' })).toHaveCount(0);
  const link = row.getByRole('link', { name: 'PDF' });
  await expect(link).toHaveAttribute('target', '_blank');

  const [tab] = await Promise.all([context.waitForEvent('page'), link.click()]);
  const href = (await link.getAttribute('href'))!;
  const pdf = await page.request.get(href);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  expect(pdf.headers()['content-disposition']).toMatch(/^inline; filename="wniosek-urlopowy-\d+\.pdf"$/);
  expect((await pdf.body()).subarray(0, 4).toString('latin1')).toBe('%PDF');
  await tab.close();

  // Cudzy numer: 404; administrator: 403.
  const id = Number(href.match(/requests\/(\d+)\/pdf/)![1]);
  expect((await page.request.get(`/api/my-leave/requests/${id + 100000}/pdf`)).status()).toBe(404);
  await logOut(page);
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  expect((await page.request.get(href)).status()).toBe(403);
});
