import { expect, test } from '@playwright/test';
import { ADMIN, DAY, employee, iso, logIn, next, password, todayUtc, typed } from './helpers';

// Scenariusze z docs/modules/calendar/TESTS-1.md. Pracownika zakłada test (e2e.tmp.*, pula 20 dni); jego wniosek
// znika razem z kontem w global-teardown.ts. Kalendarz pokazuje też innych pracowników z bazy, więc test sprawdza
// tylko swój wiersz (wyszukiwarka po nazwisku).

test('administrator widzi wniosek w kalendarzu, filtruje, zatwierdza z kalendarza i wraca ze szczegółów wniosku', async ({ page, browser }) => {
  test.setTimeout(90_000);
  // Piątek i wtorek: urlop w dniach roboczych pęka na weekend (dwa kawałki i linia).
  const friday = next(5, 3);
  const tuesday = new Date(friday.getTime() + 4 * DAY);
  test.skip(tuesday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: brak dni roboczych w roku otwartym');
  test.skip(tuesday.getTime() - todayUtc().getTime() > 59 * DAY, 'termin poza widocznymi 61 dniami');

  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const lastName = `Kalendarzowa${String.fromCharCode(97 + Math.floor(Math.random() * 26))}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
  const name = `Ewa ${lastName}`;
  const { page: ewa } = await employee(page, browser, 'Ewa', lastName);

  const overview = (await (await ewa.request.get('/api/my-leave/overview')).json()) as { types: { id: number; name: string }[] };
  const vacation = overview.types.find((t) => t.name === 'Wypoczynkowy') ?? overview.types[0]!;
  const created = await ewa.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation.id, dateFrom: iso(friday), dateTo: iso(tuesday), comment: '' } });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = (await created.json()) as { id: number };

  // Pulpit → „Otwórz kalendarz”.
  await page.goto('/admin');
  await page.getByRole('link', { name: 'Otwórz kalendarz' }).click();
  await expect(page).toHaveURL(/\/admin\/calendar$/);
  await expect(page.getByRole('heading', { name: 'Kalendarz' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dziś' })).toBeDisabled();

  // Swój wiersz: czekający pasek w dwóch kawałkach z linią w weekend.
  await page.getByLabel('Szukaj osoby').fill(lastName);
  const row = page.locator(`[data-testid="calendar-row"][data-name="${name}"]`);
  await expect(page.getByTestId('calendar-row')).toHaveCount(1);
  const pending = row.getByRole('button', { name: `${name}: ${vacation.name} (czeka)` });
  await expect(pending).toHaveCount(2);
  await expect(row.getByTestId('calendar-bridge')).toHaveCount(1);

  // Filtr koloru chowa i pokazuje paski.
  // Pole wyboru w przycisku jest schowane; klika się napis (jak użytkownik).
  const chip = page.getByRole('group', { name: 'Pokaż typy urlopów' }).locator('label', { hasText: vacation.name });
  await chip.click();
  await expect(pending).toHaveCount(0);
  await chip.click();
  await expect(pending).toHaveCount(2);

  // Wyszukiwanie bez wyników.
  await page.getByLabel('Szukaj osoby').fill('Nikogo-takiego-nie-ma');
  await expect(page.getByText('Nikt o takim imieniu lub nazwisku nie pracuje w firmie.')).toBeVisible();
  await page.getByLabel('Szukaj osoby').fill(lastName);

  // Strzałki przesuwają zakres, „Dziś” wraca.
  await page.getByRole('button', { name: '30 dni później' }).click();
  await expect(page).toHaveURL(new RegExp(`from=${iso(new Date(todayUtc().getTime() + 30 * DAY))}`));
  await page.getByRole('button', { name: 'Dziś' }).click();
  await expect(page).toHaveURL(/\/admin\/calendar$/);

  // Klik w pasek → szczegóły wniosku, zatwierdzenie z kalendarza.
  await pending.first().click();
  const drawer = page.getByRole('dialog', { name: `Wniosek nr ${id}` });
  await expect(drawer).toContainText(name);
  await drawer.getByRole('button', { name: 'Zatwierdź' }).click();
  await page.getByRole('dialog', { name: 'Zatwierdzić wniosek?' }).getByRole('button', { name: 'Zatwierdź' }).click();
  await expect(page.getByText(`Wniosek zatwierdzony. ${name} dostaje powiadomienie.`)).toBeVisible();
  await expect(row.getByRole('button', { name: `${name}: ${vacation.name}`, exact: true })).toHaveCount(2);

  // Wnioski urlopowe → szczegóły → „Pokaż w kalendarzu” od pierwszego dnia wniosku.
  await page.goto(`/admin/leave-requests/${id}`);
  await page.getByRole('dialog', { name: `Wniosek nr ${id}` }).getByRole('link', { name: 'Pokaż w kalendarzu' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/calendar\\?from=${iso(friday)}$`));
  await expect(page.getByText(`${typed(friday)} – `)).toBeVisible();
});

test('pracownik nie ma kalendarza w menu, a API odpowiada 403', async ({ page, browser }) => {
  await logIn(page, ADMIN, password());
  await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
  const { page: worker } = await employee(page, browser, 'Ida', 'Bezkalendarza');
  await expect(worker.getByRole('navigation').getByRole('link', { name: 'Pulpit' })).toBeVisible();
  await expect(worker.getByRole('navigation').getByRole('link', { name: 'Kalendarz' })).toHaveCount(0);
  expect((await worker.request.get('/api/calendar')).status()).toBe(403);
});

// Scenariusze z docs/modules/calendar/TESTS-2.md (liczenie dni i typy bez zatwierdzania).
test.describe('część 2: liczenie dni i zatwierdzanie', () => {
  test('administrator widzi kolumny „Liczenie dni” i „Zatwierdzanie” i typ „Chorobowe”', async ({ page }) => {
    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    await page.goto('/admin/leave-types');
    const table = page.getByRole('table');
    await expect(table.getByRole('columnheader', { name: 'Liczenie dni' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Zatwierdzanie' })).toBeVisible();
    const sick = table.getByRole('row', { name: /Chorobowe/ });
    await expect(sick).toContainText('dni kalendarzowe');
    await expect(sick).toContainText('bez zatwierdzenia');
  });

  test('pracownik zgłasza chorobowe 2 dni wstecz: od razu zatwierdzone, powiadomienie, ciągły pasek, wycofanie', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const from = new Date(todayUtc().getTime() - 2 * DAY);
    const to = new Date(todayUtc().getTime() + 4 * DAY);
    test.skip(from.getUTCFullYear() !== to.getUTCFullYear(), 'przełom roku: termin w dwóch latach');

    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const lastName = `Chorobowa${String.fromCharCode(97 + Math.floor(Math.random() * 26))}${String.fromCharCode(97 + Math.floor(Math.random() * 26))}`;
    const name = `Iza ${lastName}`;
    const { page: iza } = await employee(page, browser, 'Iza', lastName);

    // Pracownik: okno wniosku z typem „Chorobowe”.
    await iza.goto('/admin/my-leave');
    await iza.getByRole('button', { name: 'Złóż wniosek' }).first().click();
    const dialog = iza.getByRole('dialog', { name: 'Złóż wniosek' });
    await dialog.getByRole('combobox', { name: 'Typ urlopu' }).click();
    await iza.getByRole('option', { name: 'Chorobowe' }).click();
    await expect(dialog.getByText(/weekendy i święta też się liczą/)).toBeVisible();
    await dialog.getByRole('textbox', { name: /^Od/ }).fill(typed(from));
    await dialog.getByRole('textbox', { name: /^Do/ }).fill(typed(to));
    await dialog.getByRole('textbox', { name: /^Do/ }).blur();
    await expect(dialog.getByText('7 dni kalendarzowych')).toBeVisible();
    await dialog.getByRole('button', { name: 'Zgłoś' }).click();
    await expect(iza.getByText('Zgłoszono. Administrator dostał powiadomienie.')).toBeVisible();
    const row = iza.getByRole('row', { name: /Chorobowe/ });
    await expect(row).toContainText('Zatwierdzony');
    await expect(row).toContainText('7 dni kalendarzowych');
    await expect(row).toContainText('zatwierdzony automatycznie');

    // Administrator: powiadomienie i jeden ciągły pasek w kalendarzu (bez linii przerwy w weekend).
    await page.goto('/admin/notifications');
    await expect(page.getByText(`Zgłoszona nieobecność: ${name}`).first()).toBeVisible();
    await page.goto('/admin/calendar');
    await page.getByLabel('Szukaj osoby').fill(lastName);
    const calendarRow = page.locator(`[data-testid="calendar-row"][data-name="${name}"]`);
    await expect(calendarRow.getByRole('button', { name: `${name}: Chorobowe` })).toHaveCount(1);
    await expect(calendarRow.getByTestId('calendar-bridge')).toHaveCount(0);

    // Pracownik wycofuje pomyłkę w dniu zgłoszenia.
    await row.getByRole('button', { name: 'Wycofaj' }).click();
    const confirm = iza.getByRole('dialog', { name: 'Wycofać wniosek?' });
    await expect(confirm).toContainText('Nieobecność zniknie z kalendarza');
    await confirm.getByRole('button', { name: 'Wycofaj' }).click();
    await expect(row).toContainText('Wycofany');
    await page.reload();
    await page.getByLabel('Szukaj osoby').fill(lastName);
    await expect(calendarRow.getByRole('button', { name: `${name}: Chorobowe` })).toHaveCount(0);
  });

  test('typ kalendarzowy z zatwierdzaniem liczy weekend; zgłoszenie 1 dzień wstecz odrzucone', async ({ page, browser }) => {
    const friday = next(5, 3);
    const monday = new Date(friday.getTime() + 3 * DAY);
    test.skip(monday.getUTCFullYear() !== todayUtc().getUTCFullYear(), 'koniec roku: termin w przyszłym roku');

    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const typeName = `E2E Ojcowski ${Date.now()}`;
    const type = await page.request.post('/api/leave-types', {
      data: { name: typeName, deductsPool: false, yearlyLimit: 14, color: 'cyan', dayCount: 'calendar', requiresApproval: true },
    });
    expect(type.status(), await type.text()).toBe(201);
    const { page: ola } = await employee(page, browser, 'Ola', 'Ojcowska');
    const overview = (await (await ola.request.get('/api/my-leave/overview')).json()) as { types: { id: number; name: string }[] };
    const typeId = overview.types.find((t) => t.name === typeName)!.id;

    const created = await ola.request.post('/api/my-leave/requests', { data: { leaveTypeId: typeId, dateFrom: iso(friday), dateTo: iso(monday), comment: '' } });
    expect(created.status(), await created.text()).toBe(201);
    expect(await created.json()).toMatchObject({ status: 'pending', dayCount: 'calendar', autoApproved: false, workingDays: 4 });

    const yesterday = new Date(todayUtc().getTime() - DAY);
    const late = await ola.request.post('/api/my-leave/requests', { data: { leaveTypeId: typeId, dateFrom: iso(yesterday), dateTo: iso(yesterday), comment: '' } });
    expect(late.status()).toBe(400);
  });

  test('abuse: podrobione pola, cudzy wniosek, przejścia statusów, dwa razy naraz (prawdziwa baza)', async ({ page, browser }) => {
    test.setTimeout(90_000);
    const from = new Date(todayUtc().getTime() - 2 * DAY);
    const to = new Date(todayUtc().getTime() + 1 * DAY);
    test.skip(from.getUTCFullYear() !== to.getUTCFullYear(), 'przełom roku');
    await logIn(page, ADMIN, password());
    await expect(page.getByRole('heading', { name: 'Pulpit' })).toBeVisible();
    const { page: a } = await employee(page, browser, 'Ala', 'Nadużycie');
    const { page: b } = await employee(page, browser, 'Bartek', 'Nadużycie');
    const types = ((await (await a.request.get('/api/my-leave/overview')).json()) as { types: { id: number; name: string }[] }).types;
    const sick = types.find((t) => t.name === 'Chorobowe')!.id;
    const vacation = types.find((t) => t.name === 'Wypoczynkowy')!.id;

    // Podrobione pola: wypoczynkowy jako „zatwierdzony automatycznie” w dniach kalendarzowych → zwykły czekający w roboczych.
    const tomorrow = new Date(todayUtc().getTime() + 30 * DAY);
    if (tomorrow.getUTCFullYear() === todayUtc().getUTCFullYear()) {
      const forged = await a.request.post('/api/my-leave/requests', {
        data: { leaveTypeId: vacation, dateFrom: iso(tomorrow), dateTo: iso(tomorrow), comment: '', status: 'approved', autoApproved: true, dayCount: 'calendar', requiresApproval: false },
      });
      if (forged.status() === 201) expect(await forged.json()).toMatchObject({ status: 'pending', autoApproved: false, dayCount: 'working' });
      else expect(forged.status()).toBe(409); // weekend albo święto: brak dni roboczych, też nie „zatwierdzony”
    }

    // Wypoczynkowy wstecz (typ z zatwierdzaniem) → 400; chorobowe 8 dni wstecz → 400.
    const yesterday = new Date(todayUtc().getTime() - DAY);
    expect((await a.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation, dateFrom: iso(yesterday), dateTo: iso(yesterday), comment: '' } })).status()).toBe(400);
    const tooEarly = new Date(todayUtc().getTime() - 9 * DAY);
    if (tooEarly.getUTCFullYear() === todayUtc().getUTCFullYear()) {
      expect((await a.request.post('/api/my-leave/requests', { data: { leaveTypeId: sick, dateFrom: iso(tooEarly), dateTo: iso(tooEarly), comment: '' } })).status()).toBe(400);
    }

    // Dwa zgłoszenia chorobowego naraz na ten sam termin → jedno zapisane, drugie „termin zajęty”.
    const sickBody = { data: { leaveTypeId: sick, dateFrom: iso(from), dateTo: iso(to), comment: '' } };
    const both = await Promise.all([a.request.post('/api/my-leave/requests', sickBody), a.request.post('/api/my-leave/requests', sickBody)]);
    expect(both.map((r) => r.status()).sort()).toEqual([201, 409]);
    const saved = (await both.find((r) => r.status() === 201)!.json()) as { id: number; status: string; autoApproved: boolean };
    expect(saved).toMatchObject({ status: 'approved', autoApproved: true });

    // Cudzy wniosek: Bartek nie wycofa ani nie pobierze PDF chorobowego Ali → 404.
    expect((await b.request.post(`/api/my-leave/requests/${saved.id}/withdraw`)).status()).toBe(404);
    expect((await b.request.get(`/api/my-leave/requests/${saved.id}/pdf`)).status()).toBe(404);

    // Administrator nie zatwierdzi ani nie odrzuci już zatwierdzonego → 409.
    expect((await page.request.post(`/api/leave-requests/${saved.id}/approve`)).status()).toBe(409);
    expect((await page.request.post(`/api/leave-requests/${saved.id}/reject`, { data: { reason: 'Próba.' } })).status()).toBe(409);

    // Dwa wycofania naraz → jedno ok, drugie 409; trzecie po wycofaniu → 409.
    const withdrawals = await Promise.all([a.request.post(`/api/my-leave/requests/${saved.id}/withdraw`), a.request.post(`/api/my-leave/requests/${saved.id}/withdraw`)]);
    expect(withdrawals.map((r) => r.status()).sort()).toEqual([200, 409]);
    expect((await a.request.post(`/api/my-leave/requests/${saved.id}/withdraw`)).status()).toBe(409);

    // Zatwierdzony przez administratora urlop pracownik nie wycofa sam → 409.
    if (tomorrow.getUTCFullYear() === todayUtc().getUTCFullYear()) {
      const monday = next(1, 10);
      const req = await a.request.post('/api/my-leave/requests', { data: { leaveTypeId: vacation, dateFrom: iso(monday), dateTo: iso(monday), comment: '' } });
      if (req.status() === 201) {
        const { id } = (await req.json()) as { id: number };
        expect((await page.request.post(`/api/leave-requests/${id}/approve`)).status()).toBe(200);
        expect((await a.request.post(`/api/my-leave/requests/${id}/withdraw`)).status()).toBe(409);
      }
    }
  });
});
